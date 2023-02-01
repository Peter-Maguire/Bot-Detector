import AblyComms from "./AblyComms";


class BotDetector {
    mouseMovements: {x: number, y: number, mx: number, my: number}[] = [];

    comms: AblyComms;
    constructor(){
        this.comms = new AblyComms({a: "b"}, "aheee hee");
        this.start();
    }


    async start(){
        await this.comms.waitForConnection();
        let firstStage = await this.runFirstStageTests();
        await this.comms.sendResult("first", firstStage);
        let secondStage = await this.runSecondStageTests();
        this.comms.waitForResult().then(this.onResult.bind(this));
        await this.comms.sendResult("second", secondStage);
    }


    onResult(d: {result: boolean, token: string}){
        document.getElementById("continueButton").setAttribute("disabled", "disabled");
        document.getElementById("token").innerText = d.token;
        document.getElementById("resultBlurb").innerText = "The token below verifies your result";
        document.cookie = "";
        const header = document.getElementById("resultHeader");
        if(d.result){
            header.innerText = "Failed"
            header.className = "fail";
        }else{
            header.innerText = "Passed"
            header.className = "success";
        }
    }

    getUserAgent(){
        return navigator.userAgent;
    }

    getPluginLength(){
        return navigator.plugins.length;
    }

    getAppVersion(){
        return navigator.appVersion;
    }

    getMimeTypesLength(){
        return navigator.mimeTypes.length;
    }

    getLanguages(){
        return navigator.languages;
    }

    hasWebdriver(){
        return !!navigator.webdriver;
    }

    hasChrome(){
        return !!(navigator as any)["chrome"]
    }

    async getNotificationPermission(){
        let permissionStatus = await navigator.permissions.query({ name: "notifications" });
        return {permissions: !!navigator.permissions, permissionStatus: permissionStatus.state, notificationPermission: Notification.permission};
    }

    hasDevtools(){
        const any = /./;
        let count = 0;
        let oldToString = any.toString;

        any.toString = function() {
            count++;
            return "any";
        }
        console.debug(any);
        any.toString = oldToString;
        return count;
    }

    async getBrokenImageData(){
        return new Promise((fulfill)=>{
            let body  = document.getElementById("image-result");
            let image = document.createElement("img");
            image.src = "fake_image.png";
            body.appendChild(image);
            image.onerror = function() {
                fulfill({w: image.width, h: image.height});
            }
        });
    }

    getOuterWidth(){
        return {oh: window.outerHeight, ow: window.outerWidth};
    }

    getConnectionRtt(){
        return (navigator as any).connection?.rtt;
    }

    setupMouseListener(){
        document.getElementsByTagName("body")[0].addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    onMouseMove(e: MouseEvent){
        this.mouseMovements.push({mx: e.movementX, my: e.movementY, x: e.x, y: e.y});
    }

    async detectPuppeteerStealth(){
        let output: any[] = [];
        // Chrome contains 'native code'
        ['hardwareConcurrency', 'languages'].forEach((prop) => {
            let res;
            let objDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator), prop);

            if (objDesc !== undefined) {
                if (objDesc.value !== undefined) {
                    res = objDesc.value.toString();
                } else if (objDesc.get !== undefined) {
                    res = objDesc.get.toString();
                }
            } else {
                res = "";
            }

            output.push(prop + "~~~" + res);
        });
        // Headless = false, Chrome = true
        //@ts-ignore
        output.push(navigator.plugins[0]?.[0]?.enabledPlugin === navigator.plugins?.[0]);
        //@ts-ignore
        navigator.plugins.refresh = this.comms.channelName;
        // Chrome = channel name
        //@ts-ignore
        output.push(navigator.plugins.refresh);
        // Headless = false, Chrome = true
        //@ts-ignore
        output.push(navigator.plugins?.item(4294967296) === navigator.plugins?.[0]);
        // Headless = false, Chrome = true
        output.push(await new Promise(resolve=>{
            const obj = document.createElement("object");
            obj.data = "sample.pdf";
            obj.onload = ()=>resolve(true);
            obj.onerror = ()=>resolve(false);
            document.body.appendChild(obj);
        }));
        return output;
    }



    async runFirstStageTests(){
        return Promise.all([
            this.getConnectionRtt(),
            this.getOuterWidth(),
            this.getBrokenImageData(),
            this.hasDevtools(),
            this.getNotificationPermission(),
            this.hasChrome(),
            this.hasWebdriver(),
            this.getLanguages(),
            this.getMimeTypesLength(),
            this.getAppVersion(),
            this.getPluginLength(),
            this.getUserAgent(),
            this.detectPuppeteerStealth(),
        ])
    }

    async runSecondStageTests(){
        this.setupMouseListener();
        let timeNow = new Date();
        alert("Please press OK")
        let timeAfterAlert = new Date();
        let button = document.getElementById("continueButton");
        button.removeAttribute("disabled");
        return new Promise((fulfill)=>{
            button.onclick = ()=>{
                let timeAfterButton = new Date();
                fulfill([timeNow.getTime(), timeAfterAlert.getTime(), timeAfterButton.getTime(), this.mouseMovements])
            };
            document.getElementsByTagName("body")[0].removeEventListener("mousemove", this.onMouseMove)
        });
    }
}


new BotDetector();