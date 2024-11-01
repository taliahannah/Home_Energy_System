import fs from 'fs'
import axios from 'axios'

checkBattery()

function checkBattery() {
    const file =  '/home/talialevin/Documents//Home_Energy_System/data_skripsie_nodered/battery_percent_current.json'
    fs.readFile(file, 'utf-8', (err, data) => {
        if (err) {
            console.error('error reading battery percentage', err);
            return;
        }
        try { 
            console.log(data)
            let batteryPercent = data

            if(batteryPercent > 70) {
                checkDate(batteryPercent)
            }
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
        }
    })
}

function checkDate() {
    let dateFile = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/date_today.json'

    let today = new Date().toLocaleDateString()
    fs.readFile(dateFile, 'utf-8', (err, data) => {
        if(err) {
            console.err('error reading date', err)
        }
        else {
            let date = JSON.parse(data)
            if(date == today) {
                console.log('sonoff already turned on today')
            } 
            else {
                checkState()
            }
        }
    })
}

function checkState() {
    let stateFile = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/sonoff_json.json'
    let dateFile = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/date_today.json'

    fs.readFile(stateFile, 'utf-8', (err, data) => {
        if(err) {
            console.err('error reading sonoff state', err) 
        }
        else {
            let state = JSON.parse(data)
            let today = new Date().toLocaleDateString()
            fs.writeFile(dateFile, JSON.stringify(today), err => {
                if(err) {
                    console.err('error writing data', err)
                }
            })
            toggle()
        }
    })
}

function toggle() {
    console.log('switch turned on')

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://172.20.10.2/cs?c2=2&c1=cmnd%2Ftasmota%2Fpower%20on',
        headers: { }
    }
    axios.request(config)
    .then((response) => {
        // console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    })
}