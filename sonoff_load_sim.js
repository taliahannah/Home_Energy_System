import fs from 'fs'
import axios from 'axios'

let file = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/sonoff_minimum.json'

fs.readFile(file, 'utf8', (err, data) => {
    if(err) {
        console.err('error reading sonoff min data', err)
    }
    try {
        let dat = JSON.parse(data)
        let fore = dat.batteryFore
        let min = dat.batteryMin

        if((fore - 7.5) > min) {
            turnOn()
        }
        else {
            turnOff()
        }
    }
    catch(error) {
        console.error('error reading sonoff min data', error)
    }
})

function turnOn() {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://172.20.10.2/cs?c2=88&c1=cmnd%2Ftasmota%2Fpower%20on',
        headers: { }
    };

    axios.request(config)
    .then((response) => {
    })
    .catch((error) => {
        console.log(error);
    });
}

function turnOff() {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://172.20.10.2/cs?c2=88&c1=cmnd%2Ftasmota%2Fpower%20off',
        headers: { }
    };

    axios.request(config)
    .then((response) => {
    })
    .catch((error) => {
        console.log(error);
    });
}