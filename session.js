const crypto = require('node:crypto');

const sinWeights = {
    wasInterruptedSession: {ifFalse: 0, ifTrue: -1},
    didRequestImage: {ifFalse: -3, ifTrue: 1},
    usedWrongClientId: {ifFalse: 0, ifTrue: -10},
    outOfOrderInputs: {ifFalse: 1, ifTrue: -1},
    parseFail: {ifFalse: 0, ifTrue: -10},
    hasBadConnection: {ifFalse: 0, ifTrue: -1},
    zeroRtt: {ifFalse: 2, ifTrue: -1},
    zeroOuterWidth: {ifFalse: 1, ifTrue: -2},
    hasBadBrokenImageSize: {ifFalse: 1, ifTrue: -2},
    hasDevTools: {ifFalse: 5, ifTrue: 0},
    badNotificationPermission: {ifFalse: 1, ifTrue: -1},
    hasChrome: {ifFalse: 0, ifTrue: 1},
    hasWebdriver: {ifFalse: 1, ifTrue: -100},
    hasNoLanguages: {ifFalse: 0, ifTrue: -10},
    noMimeTypes: {ifFalse: 0, ifTrue: -10},
    headlessAppVersion: {ifFalse: 0, ifTrue: -100},
    hasNoPlugins: {ifFalse: 0, ifTrue: -1},
    headlessUserAgent: {ifFalse: 0, ifTrue: -100},
    badMouseMovement: {ifFalse: 0, ifTrue: -5},
    badAlertDismissal: {ifFalse: 0, ifTrue: -3},
    badButtonPress: {ifFalse: 0, ifTrue: -3},
    fakeHardwareProto: {ifFalse: 0, ifTrue: -5},
    fakeLanguageProto: {ifFalse: 0, ifTrue: -5},
    enabledPluginMatch: {ifFalse: 0, ifTrue: -1},
    refreshIsWriteable: {ifFalse: 0, ifTrue: -5},
    hasBadOverflow: {ifFalse: 0, ifTrue: -5},
    hasBadObjectError: {ifFalse: 0, ifTrue: -5},
    didRequestPdf: {ifFalse: -5, ifTrue: 1},
    inputTimeDiffMismatch: {ifFalse: 1, ifTrue: -5},
    startTimeNotBetweenInputTimes: {ifFalse: 1, ifTrue: -1},
}

module.exports = class Session {

    destroyed = false;
    ably;
    ablyClientId;
    ablyEncryptionPublicKey;
    ablyChannelName;
    sessionCookie;

    firstInputTime;
    secondInputTime;

    sins = {
        wasInterruptedSession: false,
        didRequestImage: false,
        usedWrongClientId: false,
        outOfOrderInputs: false,
        parseFail: false,
        hasBadConnection: false,
        zeroRtt: false,
        zeroOuterWidth: false,
        hasBadBrokenImageSize: false,
        hasDevTools: false,
        badNotificationPermission: false,
        hasChrome: false,
        hasWebdriver: false,
        hasNoLanguages: false,
        noMimeTypes: false,
        headlessAppVersion: false,
        hasNoPlugins: false,
        headlessUserAgent: false,
        badMouseMovement: false,
        badAlertDismissal: false,
        badButtonPress: false,
        inputTimeDiffMismatch: false,
        startTimeNotBetweenInputTimes: false,
        didRequestPdf: false,
    }


    constructor(ably, headerKey, bodyKey){
        this.ablyClientId = this.randomData();
        this.ablyEncryptionPublicKey = crypto.randomBytes(32);
        this.ablyChannelName = this.randomData();
        this.sessionCookie = this.randomData(16);
        this.ably = ably;

        this.start();
    }


    start(){
        this.ably.channels.get(this.ablyChannelName).subscribe((msg)=>{
            if(msg.clientId !== this.ablyClientId){
                console.log("Client ID does not match this sessions client ID", msg.clientId, this.ablyClientId);
                this.sins.usedWrongClientId = true;
                return;
            }

            if(msg.name === "input_second" && !this.firstInputTime){
                console.log("Received second input early");
                this.sins.outOfOrderInputs = true;
                return;
            }

            let output;
            try {
                let payload = msg.data.subarray(0, msg.data.length - 12);
                let encryptedData = payload.subarray(0, payload.length - 16);
                let authTag = payload.subarray(payload.length - 16, payload.length)
                let iv = msg.data.subarray(msg.data.length - 12, msg.data.length);

                let decipher = crypto.createDecipheriv("aes-256-gcm", this.ablyEncryptionPublicKey, iv);
                decipher.setAuthTag(authTag);
                let str = decipher.update(encryptedData, "binary", 'utf8');
                str += decipher.final('utf8');
                output = JSON.parse(str);
            }catch(e){
                console.error(e);
                this.sins.parseFail = true;
                return;
            }

            if(msg.name === "input_first"){
                this.firstInputTime = new Date();

                const [rtt, outerSize, brokenImageData, hasDevTools,
                    notificationPermission, hasChrome, hasWebdriver,
                    languages, mimeTypesLength, appVersion, pluginLength,
                    userAgent, [
                        hardwareConcurrencyProto,
                        languagesProto,
                        enabledPlugin,
                        refreshPlugin,
                        itemOverflow,
                        objectError,
                    ]] = output;

                this.sins.zeroRtt = rtt === 0;
                this.sins.zeroOuterWidth = outerSize.oh === 0 && outerSize.ow === 0;
                this.sins.hasBadBrokenImageSize = brokenImageData.w !== 16 && brokenImageData.h !== 16;
                this.sins.hasDevTools = !!hasDevTools
                this.sins.badNotificationPermission = notificationPermission.permissionStatus === "prompt" && notificationPermission.notificationPermission === "denied";
                this.sins.hasChrome = hasChrome;
                this.sins.hasWebdriver = hasWebdriver;
                this.sins.hasNoLanguages = languages.length === 0;
                this.sins.noMimeTypes = mimeTypesLength === 0;
                this.sins.headlessAppVersion = appVersion.toLowerCase().includes("headless");
                this.sins.hasNoPlugins = pluginLength === 0;
                this.sins.headlessUserAgent = userAgent.toLowerCase().includes("headless");
                this.sins.fakeHardwareProto = !hardwareConcurrencyProto.includes("native code");
                this.sins.fakeLanguageProto = !languagesProto.includes("native code");
                this.sins.enabledPluginMatch = !enabledPlugin;
                this.sins.refreshIsWriteable = refreshPlugin === this.ablyChannelName;
                this.sins.hasBadOverflow = !itemOverflow;
                this.sins.hasBadObjectError = !objectError;
            }else if(msg.name === "input_second"){
                this.secondInputTime = new Date();
                const [startTime, alertTime, buttonTime, mouseMovements] = output;
                console.log(output);
                this.sins.badMouseMovement = true;
                for(let i = 0; i < mouseMovements.length; i++){
                    let movement = mouseMovements[i];
                    console.log(movement);
                    if(movement.mx !== 0 && movement.my !== 0){
                        this.sins.badMouseMovement = false;
                        break;
                    }
                }




                let timeToAlert = alertTime-startTime;
                let timeToButton = buttonTime-alertTime;
                console.log(`${timeToAlert}ms to alert, ${timeToButton}ms to button`);
                this.sins.badAlertDismissal = timeToAlert < 100;
                this.sins.badButtonPress = timeToButton < 100;
                this.sins.inputTimeDiffMismatch = Math.abs((this.secondInputTime-this.firstInputTime) - (buttonTime - startTime)) > 10000;
                this.sins.startTimeNotBetweenInputTimes = this.firstInputTime > startTime || this.secondInputTime < startTime;
                console.log(this.firstInputTime, startTime, this.secondInputTime, this.firstInputTime > startTime, this.secondInputTime < startTime)

                let totalSin = this.calculateSin();
                console.log(`Sin result: ${totalSin}`);
                console.log(this.sins);
                this.ably.channels.get(this.ablyChannelName.substring(1)).publish("result", {result: totalSin < 1, token: this.createAuthenticityToken(totalSin)})
                this.destroy();
            }
        })
    }

    createAuthenticityToken(totalSin){
        let sinValue = this.mapSinFlags();
        console.log("Sin value ", sinValue);

        const encryptedData = {sinValue, totalSin, sid: this.sessionCookie};
        const iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.TOKEN_KEY, 'base64'), iv);
        let encrypted = cipher.update(JSON.stringify(encryptedData))
        encrypted = Buffer.concat([encrypted, cipher.final(), iv]);
        return encrypted.toString('base64url');
    }

    mapSinFlags(){
        let output = 0;
        const configOptions = Object.keys(sinWeights);
        for(let i = 0; i < configOptions.length; i++){
            output += +this.sins[configOptions[i]]<<i
        }
        return output;
    }

    calculateSin(){
        let output = 0;
        let sins = Object.keys(sinWeights);
        for(let i = 0; i < sins.length; i++){
            const weights = sinWeights[sins[i]];
            const value = this.sins[sins[i]];
            console.log(sins[i], output, value, weights.ifTrue, weights.ifFalse);
            output += value ? weights.ifTrue : weights.ifFalse;
        }
        return output;
    }

    destroy(){
        this.destroyed = true;
        this.ably.channels.get(this.ablyChannelName).unsubscribe();
    }

    randomData(amt = 8){
        return crypto.randomBytes(8).toString("hex");
    }
}