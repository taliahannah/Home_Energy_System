import fs from 'fs'
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const serialNumber = process.env.SERIALNUMBER
const bearerToken = process.env.BEARERTOKEN

const loadshedding_status = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/loadshedding_status.json';
const loadshedding_area = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/loadshedding_area.json'
const foreLocal = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/forecasted_from_py.json'
const battPerFile = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/battery_percent_current.json'
const invSetting = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/previous_inverter_percentage.json'
const sonoffMin = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/sonoff_minimum.json'

let batteryFore = []
let batteryForeArr = []
let batteryForeMin = []
let setPercentage = new Array(8).fill(30)
let currentBattery = 0
let stage = 0

fetchEspStatus()

function fetchEspStatus() {  
    fs.readFile(loadshedding_status, 'utf-8', (err, data) => {
        if (err) {
            console.error('error reading loadshedding status', err)
            return
        }
        try {
            let jsonData = JSON.parse(data)
            stage = jsonData
            loadsheddingBattery(stage)
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError)
        }
    })
}

function loadsheddingBattery(stage) { 
    fs.readFile(loadshedding_area, 'utf-8', (err, data) => {
        if(err) {
            console.error('error reading loadshedding area', err)
            return
        }
        try {
            let areaData = JSON.parse(data)
            let currentStage = ''

            if(areaData.info.region.includes('Eskom')) {
                currentStage = stage.status.eskom.stage
            }
            else {
                currentStage = stage.status.capetown.stage
            }
            getLsoadsheddingHours(currentStage)
        }
        catch(error) {
            console.error(error)
        }
    })
}


function getLsoadsheddingHours(currentStage) { 
    let loadshedding_area = './data_skripsie_nodered/loadshedding_area.json'
    let lsForecastingHours = [], lsForecastingLength = []
    let lsLength = 0

    fs.readFile(loadshedding_area, 'utf-8', (err, data) => {
        if(err) {
            console.error('error reading loadshedding area', err)
            return
        }
        try {
            let areaData = JSON.parse(data)
            // let currentStage = ''
            let loadsheddingCurrent = Array.apply(null, Array(48)).map(() => 0)
            let loadsheddingLength = Array.apply(null, Array(48)).map(() => 0)
            let loadsheddingHours = Array.apply(null, Array(48)).map(() => 0)

            // if(areaData.info.region.includes('Eskom')) {
            //     currentStage = stage.status.eskom.stage
            // }
            // else {
            //     currentStage = stage.status.capetown.stage
            // }
            let debug = true
            if(debug) {
                currentStage = 6
            }

            if(currentStage != 0) {
                let loadShedding = areaData.schedule.days.map(day => day.stages[currentStage-1])
                let loadsheddingToday = loadShedding[0]
                let loadsheddingTomorrow = loadShedding[1]
                let todTomLs = loadsheddingToday.concat(loadsheddingTomorrow)
                // console.log(todTomLs)
                let nextDay = loadsheddingToday.length

                for(let i = 0; i < todTomLs.length; i++) {
                    // console.log(i)

                    if(todTomLs[1] != 0) {
                        let start = todTomLs[i].toString().substring(0, 2)
                        let end = todTomLs[i].toString().substring(6, 8)
                        if(i >= nextDay) {
                            start = parseInt(start) + 24
                            end =  parseInt(end) + 24
                        }
                        // console.log(start, end)

                        loadsheddingCurrent[parseInt(start)] = 1  // sets index of start time of ls to 1
                        loadsheddingLength[parseInt(start)] = parseInt(end) - parseInt(start) + 0.5  // get length of loadshedding starting at index
                        if(loadsheddingLength[parseInt(start)] == 2.5) {
                            loadsheddingHours[parseInt(start)] = 1
                            loadsheddingHours[parseInt(start) + 1] = 1
                            loadsheddingHours[parseInt(start) + 2] = 0.5
                        }
                        else if(loadsheddingLength[parseInt(start)] == 4.5) {
                            loadsheddingHours[parseInt(start)] = 1
                            loadsheddingHours[parseInt(start) + 1] = 1
                            loadsheddingHours[parseInt(start) + 2] = 1
                            loadsheddingHours[parseInt(start) + 3] = 1
                            loadsheddingHours[parseInt(start) + 4] = 0.5
                        }
                    }
                }

                let hour = new Date().getHours('en-ZA')
                console.log(hour)

                if(loadsheddingHours[2] != 0) {  // if loadshedding 2 hours from now
                    for(let i = 0; i < 5; i++) { // check length of ls (2.5 or 4.5 hours)
                    lsLength = lsLength + loadsheddingHours[i+hour+2]
                    }
                }

                console.log('l',lsLength, loadsheddingHours)
            } 
            else {
                console.log('there is no loadshedding')
            }
            // console.log(loadsheddingHours)

            getForecast(currentStage, lsLength)
        }
        catch(error) {
            console.error(error)
        }
    })
}

function getForecast(currentStage, lsLength) {
    fs.readFile(foreLocal, 'utf8', (err, data) => {
        if(err) {
            console.error('error fetching forecasting data from set_battery.js', err)
        }
        try {
            let temp = JSON.parse(data)
            batteryFore = temp.battery
            getCurrentPercentage(batteryFore, currentStage, lsLength)
        }
        catch(error) {
            console.error('error reading forecasting data from set_battery.js', error)
        }
    })
}

function getCurrentPercentage(batteryFore, currentStage, lsLength) {
    fs.readFile(battPerFile, 'utf8', (err, data) => {
        if(err) {
            console.error('error reading current percentage from set_battery.js', err)
        }
        try {

            let four_hour = [31.26, 30.98, 29.3, 26.85, 25.82, 28,37, 28.32, 24.2, 17.16, 18.9, 26.65]
            let six_hour = [38.35, 36.25, 34.24, 30.62, 31.07, 29.65, 32.84, 54.65, 67.14, 62.42, 37.68, 36.6]
            let hour = new Date().toLocaleTimeString()
            hour = hour.substring(0,2)

            currentBattery = JSON.parse(data)
            let tempB = 0

            if(lsLength == 4.5) {
                currentBattery = four_hour[hour/2]
            }
            else if(lsLength == 6.5) {
                currentBattery = six_hour[hour/2]
            }

            for(let i = 0; i < 80; i++) {
                tempB += parseFloat(batteryFore[`b_${i}`])
                batteryForeMin[i] = (-1 * tempB) + 10
            }

            tempB = 0

            for(let i = 0; i < 80; i++) {
                tempB += parseFloat(batteryFore[`b_${i}`])
                batteryForeArr[i] = currentBattery + tempB
                if(batteryForeArr[i] >= 100) {
                    batteryForeArr[i] = 100
                }
                if(batteryForeArr[i] < 0) {
                    batteryForeArr[i] = 0
                }
            }

            let index = 0
            for(let i = 0; i < batteryForeMin.length; i++) {
                if(batteryForeMin[i] >= 30) {
                    if(batteryForeMin[i] > batteryForeArr[i]) {
                        setPercentage[index] = batteryForeMin[i]
                    }                    
                    else { setPercentage[index] = 30 }
                }
                else { setPercentage[index] = 30 }
                index++
            }

            let sonoffFore = {
                'batteryFore':batteryForeArr[11],
                'batteryMin':batteryForeMin[11]
            }

            console.log(sonoffFore)

            fs.writeFile(sonoffMin, JSON.stringify(sonoffFore), 'utf8', err => {
                if(err) {
                    console.error('error writing sonoff forecast min', err)
                }
            })

            let sixHourForecast = setPercentage[24]

            if(sixHourForecast > 90) {
                sixHourForecast = 90
            }
            checkCurrentInverterPercentage(sixHourForecast, currentStage)
        }
        catch(error) {
            console.error('error reading current percentage from set_battery.js', error)
        }
    })
}

function checkCurrentInverterPercentage(sixHourForecast, currentStage) {
    fs.readFile(invSetting, 'utf8', (err, data) => {
        if(err) {
            console.error('error fetching inverter setting from set_battery.js', err)
        }
        try {
            let hour = new Date().toLocaleTimeString()
            hour = hour.substring(0,2)
            let previousPercentage = JSON.parse(data)

            if((previousPercentage != sixHourForecast) && (currentStage != 0) && (hour % 2 == 0)) {
                changeInverterSetting(sixHourForecast)
            }
            fs.writeFile(invSetting, JSON.stringify(sixHourForecast), 'utf8', err => {
                if(err) {
                    console.error('error writing previous inverter setting', err)
                }
            })
        }
        catch(error) {
            console.error('error reading inverter setting from set_battery.js', error)
        }
    })
}

function changeInverterSetting(sixHourForecast) {
    let data = JSON.stringify({
        "sn": serialNumber,
        "safetyType": "2",
        "battMode": "-1",
        "batteryCap": "193",
        "batteryMaxCurrentCharge": "120",
        "batteryMaxCurrentDischarge": "120",
        "batteryEmptyV": "45",
        "batteryImpedance": "8",
        "batteryEfficiency": "99",
        "batteryShutdownCap": "15",
        "batteryLowCap": "16",
        "batteryRestartCap": "17",
        "batteryShutdownVolt": "46",
        "batteryLowVolt": "47.5",
        "batteryRestartVolt": "52",
        "batteryOn": "1",
        "floatVolt": "56.4",
        "lithiumMode": "0",
        "sdChargeOn": "1",
        "sdStartCap": sixHourForecast,
        "sdBatteryCurrent": "40",
        "genChargeOn": "0",
        "sdStartVol": "undefined",
        "gridSignal": "0",
        "generatorStartVolt": "0",
        "generatorStartCap": "10",
        "generatorBatteryCurrent": "40",
        "equChargeCycle": "0",
        "equChargeTime": "0",
        "absorptionVolt": "54",
        "equVoltCharge": "54",
        "tempco": "5",
        "genSignal": "0",
        "sdStartVolt": "49",
        "generatorForcedStart": "0",
        "bmsErrStop": "0",
        "signalIslandModeEnable": "1",
        "lowPowerMode": "0",
        "disableFloatCharge": "0",
        "lowNoiseMode": "8000"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://api.sunsynk.net/api/v1/common/setting/${serialNumber}/set`,
        headers: { 
            'Authorization': `Bearer ${bearerToken}`, 
            'Content-Type': 'application/json', 
            'Accept-Language': ' en-GB,en;q=0.9', 
            'Origin': 'https://setting.inteless.com', 
            'Referer': 'https://setting.inteless.com', 
            'Sec-Fetch-Dest': 'empty', 
            'Sec-Fetch-Mode': 'cors', 
            'Sec-Fetch-Site': 'cross-site'
        },
        data : data
    };

    axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    })
}