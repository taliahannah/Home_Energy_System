let debug = false

let first = true
let targetDay = 0
let targetDayKey = 'day_0'
let clicks = 0
let hourRad = []
let radDay = []
let radTom = []

let sonoff_json = './data_skripsie_nodered/sonoff_json.json' // used
let loadshedding_area = './data_skripsie_nodered/loadshedding_area.json';
let loadshedding_status = './data_skripsie_nodered/loadshedding_status.json';
let weather_data = './data_skripsie_nodered/weather_data.json';
let sonoff_status = './data_skripsie_nodered/sonoff_status.txt'; // used
let inverter_data = './data_skripsie_nodered/inverter_data.json';
let sonoff_stat_node = './data_skripsie_nodered/sonoff_node.json'
let today = new Date(); //get today's date
let todayF = today.toISOString().split('T')[0]
// console.log('tf', todayF)

updateDayDisplay()
todayOnly()
inverterGraphs(inverter_data, targetDayKey) 
getSonoffStat(sonoff_stat_node)
weatherGraphs(weather_data)
fetchEspStatus(loadshedding_status, loadshedding_area)
oneDaySolar(weather_data)
todayOnly()

// TODO get time switch is on and off? And also get the telemetry stuff 

function getSonoffStat(sonoff_stat_node) {  
    document.addEventListener('DOMContentLoaded', () => {
        fetch(sonoff_stat_node)
        .then(response => {
            if(!response.ok) {
                throw new Error('Network response was not ok - sonoff state');
            }
            return response.json();
        })
        .then(data => {
            let sonoffState = data.state
            document.getElementById('sonoffCurrent').textContent = sonoffState
        })
        .catch(error => {
            console.error('Error fetching sonoff data: ', error);
        })    
    })
}

function inverterGraphs(inverter_data, targetDayKey) {
    fetch(inverter_data) 
    .then(response => {
        if(!response.ok) {
            throw new Error('Network response was not ok - inverter data');
        }
        return response.json();
    })
    .then(data => {
        let time = []
        let date = []
        let timeDate = []
        let dailyUsedArr = []
        let battEnergyArr = []
        let pvTodayArr = []
        let dailyUsed = 'dailyUsed(kWh)/84'
        let batteryEnergy = 'batteryEnergy(%)/184'
        let pvToday = 'pvetoday(kWh)/108'
        let targetDay = targetDayKey

        console.log(targetDay)

        if(targetDay == 'day_0') { 
            todayOnly()
        }
        else {
            if(targetDay == 'day_1') {
                targetDay = 'day_6'
            }
            else if(targetDay == 'day_2') {
                targetDay = 'day_5'
            }
            else if(targetDay == 'day_3') {
                targetDay = 'day_4'
            }
            else if(targetDay == 'day_4') {
                targetDay = 'day_3'
            }
            else if(targetDay == 'day_5') {
                targetDay = 'day_2'
            }
            else if((targetDay == 'day_6')) {
                targetDay = 'day_1'
            }

            Object.keys(data).forEach(pageKey => {
                if (pageKey.startsWith(targetDay)) {
                    const page = data[pageKey];
                    page.record.forEach(record => {
                        timeDate.push(record.Time)
                        battEnergyArr.push(record[batteryEnergy])
                        dailyUsedArr.push(record[dailyUsed])
                        pvTodayArr.push(record[pvToday])
                    })
                }
            })

            pvTodayArr.reverse()
            battEnergyArr.reverse()
            dailyUsedArr.reverse()
            timeDate.reverse()

            // get time from the datetime of inverter data timestamp
            for(let i = 0; i < timeDate.length; i++) {
                time[i] = timeDate[i].toString().substring(5, 16) 
            }
            // get just date from inverter data timestamp
            for(let i = 0; i < timeDate.length; i++) { 
                date[i] = new Date(timeDate[i].toString().substring(0, 10))
            }

            // create titles for inverter charts
            const options = {weekday: 'long', day: 'numeric', month: 'short'}
            let formattedDate = date[0].toLocaleDateString('en-ZA', options)
            let titleSunsynk1 = 'Battery Percentage for ' + formattedDate
            let titleSunsynk2 = 'Cumulative Power Usage for ' + formattedDate
            let titleSunsynk3 = 'PV Generated for ' + formattedDate

            for(let i = 0; i < time.length; i++) {
                time[i] = time[i].slice(6,11)
            }
            
            // create the inverter charts
            createChart('ctxBattEn', 'ctxBattEn', titleSunsynk1, time, battEnergyArr, 'Time', 'Battery Energy [%]')
            createChart('ctxPower', 'ctxPower', titleSunsynk2, time, dailyUsedArr, 'Time', 'Daily Usage [kW]')
            createChart('ctxPV', 'ctxPV', titleSunsynk3, time, pvTodayArr, 'Time', 'PV Generated [kWh]')
        }
    })
    .catch(error => {
        console.error('Error fetching sunsynk data: ', error);
    })    
}

function todayOnly() {
    console.log('test')
    let one_day_inv = 'http://127.0.0.1:5500/data_skripsie_nodered/one_day_inverter_data.json'
    document.addEventListener('DOMContentLoaded', () => {

    fetch(one_day_inv) 

    .then(response => {
        if(!response.ok) {
            throw new Error('Network response was not ok - todays inverter data');
        }
        return response.json();
    })
    .then(data => {
        let timeDate = []
        let dailyUsedArr = []
        let battEnergyArr = []
        let pvTodayArr = []
        let dailyUsed = 'dailyUsed(kWh)/84'
        let batteryEnergy = 'batteryEnergy(%)/184'
        let pvToday = 'pvetoday(kWh)/108'

        Object.keys(data).forEach(pageKey => {
            const page = data[pageKey];
            page.record.forEach(record => {
                timeDate.push(record.Time)
                battEnergyArr.push(record[batteryEnergy])
                dailyUsedArr.push(record[dailyUsed])
                pvTodayArr.push(record[pvToday])
            })
        })


        pvTodayArr.reverse()
        battEnergyArr.reverse()
        dailyUsedArr.reverse()
        timeDate.reverse()

        irradianceDataToday(battEnergyArr, dailyUsedArr, timeDate, pvTodayArr, weather_data)

    })
    .catch(error => {
        console.error('Error fetching todays sunsynk data: ', error);
    })
})
}

function irradianceDataToday(battEnergyArr, dailyUsedArr, timeDate, pvTodayArr, weather_data) {

    fetch(weather_data)
    .then(response => {

        if(!response.ok) {
            throw new Error('Network response was not ok - irradiance')
        }
        return response.json();
    })
    .then(data => {
        let radDay = data.days[0]

        secondGraphToday(battEnergyArr, dailyUsedArr, timeDate, pvTodayArr, radDay, radTom)
    })
    .catch(error => {
        console.error('Error fetching irradiance data: ', error);
    })    
}

function secondGraphToday(battEnergyArr, dailyUsedArr, timeDate, pvTodayArr, radDay, radTom) {
    let foreLocal = './data_skripsie_nodered/forecasted_from_py.json'
    let time = []
    let date = []

    // let radT = 
    // let raddd = (radDay.hours.solarradiation).concat()
    // console.log('r', raddd)


    fetch(foreLocal)
    .then(response => {

        if(!response.ok) {
            throw new Error('Network response was not ok - today sunsynk');
        }
        return response.text();
    })
    .then(data => {
        data = JSON.parse(data)
        let powerFore = []
        let batteryFore = []
        let timeFore = []
        let dailyFore = []
        let powerForeFinal = []
        let batteryForeFinal = []
        let timeForeFinal = []
        let dailyForeFinal = []
        let solarFore = []
        let irradiance = []
        let solarForeFinal = []
        let extendedSolar = []
        let hoursTime = new Date()
        hoursTime = hoursTime.getHours()
        let temp = 0
        let tempB = 0
        let tempD = 0
        let today = new Date().toISOString().split('T')[0]

        console.log(data)

        Object.keys(data.daily).forEach(key => {
            powerFore.push(data.daily[key])
        })
        Object.keys(data.battery).forEach(key => {
            batteryFore.push(data.battery[key])
        })
        Object.keys(data.time).forEach(key => {
            timeFore.push(data.time[key])
        })
        Object.keys(data.daily).forEach(key => {
            dailyFore.push(data.daily[key])
        })
        Object.keys(data.solar).forEach(key => {
            solarFore.push(data.solar[key])
        })
        

        let currentBatt = parseFloat(battEnergyArr[battEnergyArr.length - 1])
        let currentPow = dailyUsedArr[dailyUsedArr.length - 1]
        let currentDaily = currentPow
        document.getElementById('currentBatt').textContent = currentBatt
        
        for(let i = 0; i < batteryFore.length; i++) {
            tempB = tempB + parseFloat(batteryFore[i])
            batteryFore[i] = parseFloat(currentBatt) + tempB // parseFloat(batteryFore[i]) //parseFloat(batteryFore[i])
            batteryFore[i] = batteryFore[i].toFixed(2)
            if(batteryFore[i] >= 100) {
                batteryFore[i] = 100
            }
            if(batteryFore[i] < 0) {
                batteryFore = 0
            }
        }

        for(let i = 0; i < 24; i++) {
            temp = parseFloat(powerFore[i]) + temp
            powerFore[i] = parseFloat(currentPow) + parseFloat(temp)

            tempD = parseFloat(dailyFore[i]) + parseFloat(tempD)
            dailyFore[i] = parseFloat(currentDaily) + parseFloat(tempD)
        }
        for(let i = 0; i < 24; i ++) {
            batteryForeFinal[i+battEnergyArr.length-1] = batteryFore[i]
            powerForeFinal[i+dailyUsedArr.length-1] = powerFore[i]
            dailyForeFinal[i+dailyUsedArr.length-1] = dailyFore[i]
            timeForeFinal[i] = `${today} ${timeFore[i]}`
        }


        // if(hoursTime > 22) {
        //     rad
        // }

        console.log(hoursTime)

        // hoursTime = 8
        let currentIrradiance = pvTodayArr[pvTodayArr.length - 1]
        // currentIrradiance = 1.4
        // console.log(currentIrradiance)
        let startIrradTime = parseInt(hoursTime) - 1
        for(let i = 0; i < 3; i++) {
            let rad1 = radDay.hours[(hoursTime+i) % 24].solarradiation
            irradiance[i] =  parseFloat(currentIrradiance) + (solarFore[startIrradTime+i] *  parseFloat(rad1)/1000 * 2.117 * 1.052  * 10)
        }
        console.log(irradiance)
        let index = 1
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < 12; j++) {
                extendedSolar[index] = irradiance[i]
                index++
            }
        }
        let solarForeFinal_ = []
        for(let i = 0; i < pvTodayArr.length; i ++) {
            solarForeFinal[i+pvTodayArr.length-1] = extendedSolar[i]
        }
        console.log(solarForeFinal)
        for(let i = 235; i < solarForeFinal.length; i++) {
            solarForeFinal_[i] = 3.2
        }
        console.log(solarForeFinal_)
        timeDate = timeDate.concat(timeForeFinal)
        for(let i = 0; i < timeDate.length; i++) {
            time[i] = timeDate[i].toString().substring(5, 16)
        }
        for(let i = 0; i < timeDate.length; i++) { 
            date[i] = new Date(timeDate[i].toString().substring(0, 10))
        }

        // create titles for inverter charts
        const options = {weekday: 'long', day: 'numeric', month: 'short'};
        let formattedDate = date[0].toLocaleDateString('en-ZA', options); // Use 'en-GB' for day-month format
        let titleSunsynk1 = 'Battery Percentage for ' + formattedDate
        let titleSunsynk2 = 'Cumulative Energy Usage for ' + formattedDate
        let titleSunsynk3 = 'PV Generated for ' + formattedDate


        

        // create the inverter data charts
        createChartTwoLines('ctxPV', 'ctxPV', titleSunsynk3, time, pvTodayArr, 'Actual PV Generated', solarForeFinal, 'Forecasted Solar Irradiance', 'Time', 'PV Generated [kWh]')
        createChartTwoLines('ctxPower', 'ctxPower', titleSunsynk2, time, dailyUsedArr, 'Actual Energy Usage', dailyForeFinal, 'Forecasted Energy Usage', 'Time', 'Daily Usage [kWh]')
        createChartTwoLines('ctxBattEn', 'ctxBattEn', titleSunsynk1, time, battEnergyArr, 'Actual Battery Percentage', batteryForeFinal, 'Forecasted Battery Percentage', 'Time', 'Battery Energy [%]')
        console.log('test')
    
    })
    .catch(error => {
        console.error('Error fetching sunsynk data: ', error);
    })    
}

let irradianceReady = false

function useRadDayWhenReady(callback) {
    if (irradianceReady) {
        callback(radDay);
    } else {
        setTimeout(() => useRadDayWhenReady(callback), 100);
    }
}

function oneDaySolar(weather_data) {
    return new Promise((resolve, reject) => {
        document.addEventListener('DOMContentLoaded', () => {
            fetch(weather_data)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok - rad one day data');
                    }
                    return response.json();
                })
                .then(data => {
                    const radDay = data
                    resolve(radDay)
                })
                .catch(error => {
                    console.error('Error fetching irradiance: ', error)
                    reject(error)
                })
        })
    })
}

updateDayDisplay()

function changeDay(direction) {
    targetDay += direction
    if (targetDay < 0) {
        targetDay = 0
    } else if (targetDay > 6) {
        targetDay = 6
    }

    updateDayDisplay()
    let targetDayKey = `day_${targetDay}`
    inverterGraphs(inverter_data, targetDayKey)
    if(first) {
        todayOnly()
        first = false
    }
}

// todayOnly()


function updateDayDisplay() {
    let dayText = ''
    targetDay = parseInt(targetDay)
    if (targetDay == 0) {
        dayText = 'Today';
    } else if (targetDay == 1) {
        dayText = 'Yesterday'
    } else {
        dayText = `${targetDay} days ago`
    }
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('currentDayDisplay').textContent = dayText;
    })
}

updateDayDisplay()
function outsideDataLess(direction) {
    clicks = direction + clicks
    console.log(clicks)

    if(clicks > 6) {
        clicks = 6
        endData = '<mark>' + 'No more data. Go to Next Day' + '</mark>'
        document.getElementById('endData').innerHTML = endData
    }
    else if(clicks < 0) {
        clicks = 0
        endData = '<mark>' + 'No more data. Go to Previous Day' + '</mark>'
        document.getElementById('endData').innerHTML = endData    
    }
    else {
        document.getElementById('endData').textContent = null
    }
}

function fetchEspStatus(loadshedding_status) {
    // document.addEventListener('DOMContentLoaded', () => {
        fetch(loadshedding_status) 
        .then(response => {
            if(!response.ok) {
                throw new Error('Network response was not ok - loadshedding data');
            }
            return response.json()
        })
        .then(data => {
            stage = data
            espFetch(stage)

        })
        .catch(error => {
            console.error('Error fetching loadshedding stage: ', error)
        })
    // })
}

function espFetch(stage) {
    // document.addEventListener('DOMContentLoaded', () => {
        fetch(loadshedding_area)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            return response.json();
        })
        .then(data => {
            let loadsheddingCurrent = ''
            let currentStage = ''

            if(data.info.region.includes('Eskom')) {
                currentStage = stage.status.eskom.stage
                document.getElementById('stage').textContent = currentStage;
            }
            else {
                currentStage = stage.status.capetown.stage
                document.getElementById('stage').textContent = currentStage;
            }

            console.log(currentStage)

            determineBatteryCharge(data, currentStage)
                    
            let dates = data.schedule.days.map(day => day.date)
            let dayName = data.schedule.days.map(day => day.name)
            let loadShedding = data.schedule.days.map(day => day.stages[currentStage - 1])
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

            if(currentStage == 0) {
                loadsheddingCurrent = 'There is currently no loadshedding scheduled';
                document.getElementById('loadsheddingCurrent').textContent = loadsheddingCurrent
            }
            else{
                for(let i = 0; i < dates.length; i++) {
                    let name = ''
                    if(loadShedding[i]) {
                        let ls = loadShedding[i].join(', ') 
                        if(ls == 0) {
                            ls = 'No loadshedding today'
                        }
                        if(i === 0) {
                            loadsheddingCurrent += '<mark>' + '<b>' + 'Today - ' + dayName[i] + ' ' + dates[i].substring(8, 10) + ' ' + months[dates[i].substring(5, 7) - 1] + ': ' + ls + '</b>' + '</mark>' + '<br>'
                        }
                        else {
                            loadsheddingCurrent += '<b>' + dayName[i] + ' ' + dates[i].substring(8, 10) + ' ' + months[dates[i].substring(5, 7) - 1] + ': ' + '</b>' + ls + '<br>'
                        }
                    }
                }    
            document.getElementById('loadsheddingCurrent').innerHTML = loadsheddingCurrent
            }
        })
        .catch(error => {
            console.error('Error fetching loadshedding status: ', error)
        })
    // })
}


function determineBatteryCharge(data, currentStage) {
    let loadsheddingState = []
    let loadsheddingLength = []

    let loadShedding = data.schedule.days.map(day => day.stages[currentStage - 1])
    let currentDate = new Date()
    let time = currentDate.getHours(); 
    let loadsheddingToday = loadShedding[0]

    if(currentStage != 0) {
        for(let i = 0; i < loadsheddingToday.length; i++) {
            let hours = loadShedding[0]
            let start = parseInt(hours[i].toString().substring(0, 2))
            let end = parseInt(hours[i].toString().substring(6, 8))

            if( (parseInt(time)) === (parseInt(hours[i])) ) {
                console.log('currently loadshedding')
                loadsheddingState[0] = 1
                loadsheddingLength[0] = end-start+0.5
            }
            else {
                loadsheddingState[0] = 0
                loadsheddingLength[0] = 0
            }

            if( (parseInt(time) + 2) === (parseInt(hours[i])) ) {
                console.log('loadshedding two hours from ' + time + ':00')
                loadsheddingState[2] = 1
                loadsheddingLength[2] = end-start+0.5
            }
            else {
                loadsheddingState[2] = 0
                loadsheddingLength[2] = 0
            }

            if( (parseInt(time) + 4) === (parseInt(hours[i])) ) {
                console.log('loadshedding in four hours from ' + time + ':00')
                loadsheddingState[4] = 1
                loadsheddingLength[4] = end-start+0.5
            }
            else {
                loadsheddingState[4] = 0
                loadsheddingLength[4] = 0
            }
        }   
    }
}

let number = []


function weatherGraphs(weather_data) {
    document.addEventListener('DOMContentLoaded', () => {
        fetch(weather_data) // fetch weather data
        .then(response => {
            return response.json();
        })
        .then(data => {
            // get data
            let dates = data.days.map(day => day.datetime) //get time from JSON format 
            console.log('weather data dates', dates)
            dates = dates.slice(0, 7) //get time from JSON format 
            console.log('sliced dates', dates)

            let temps = data.days.map(day => day.temp).slice(0, 7) //get temperature from JSON format
            let cloudCover = data.days.map( day => day.cloudcover).slice(0, 7)
            let solarradiation = data.days.map(day => day.solarradiation).slice(0, 7)
            let description = 'Today: ' + data.days[0].description
            document.getElementById('description').textContent = description
            // let windSpeed = data.days.map( day => day.windspeed)

            // format date for chart titles
            const options = {weekday: 'short', day: 'numeric', month: 'short'}
            let newDatePlot = dates.map(date => new Date(date).toLocaleDateString('en-ZA', options));
            let date = new Date()
            let dateFirst = date.toLocaleDateString('en-ZA', options)
            let dateLast = new Date(date.setDate(date.getDate() + 6)).toLocaleDateString('en-ZA', options)
            
            //create titles 
            let titleTemp = `Average Temperature for ${dateFirst} to ${dateLast}`
            let titleIrr = `Irradiance for ${dateFirst} to ${dateLast}`
            let titleCloud = `Cloud Clover for ${dateFirst} to ${dateLast}`
            // let titleWind = `Wind Speed for ${dateFirst} to ${dateLast}`

            // create charts
            createChart('ctx1', 'tempChart1', titleTemp, newDatePlot, temps, 'Date', 'Temperature [°C]')       
            createChart('ctx2', 'tempChart2', titleIrr, newDatePlot, solarradiation, 'Date', 'Solar Irradiance [W/m^2]')             
            createChart('ctx3', 'tempChart3', titleCloud, newDatePlot, cloudCover, 'Date', 'Cloud Cover [%]')       
            
            
            console.log('dates for plotting', newDatePlot) 
            // createChart('ctx4', 'tempChart4', titleWind, dates, windSpeed, 'Date', 'Wind Speed [km/h]')
            })
        .catch(error => {
            console.error('Error fetching weather data: ', error);
        })
    })
}

// import axios from "axios"

function toggle() {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://172.20.10.2/cs?c2=2&c1=cmnd%2Ftasmota%2Fpower%20toggle',
        headers: { }
    }
    axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    })
}

function createChart(chartName, HTML_ID, title, x_data, y_data, x_label, y_label) { 
    chartName = document.getElementById(HTML_ID).getContext('2d');
    if (chartName.chart) {
        chartName.chart.destroy(); // Destroy the existing chart
    }
    let otherBlueLine = 'rgba(75, 180, 230, 0.9)'
    let otherBlueFill = 'rgba(75, 180, 230, 0.3)'

    chartName.chart = new Chart(chartName, {
        type: 'line',
        data: {
            stacked: false,
            labels: x_data, 
            datasets: [{
                data: y_data,
                borderColor: otherBlueLine,
                backgroundColor: otherBlueFill,
                fill: true,
                tension: 0.4,
            }]
        },
        options: {
            layout: {
                padding: {
                    right: 25, 
                    left: 10,
                    bottom: 10,
                    top: 5,
                },
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    align: 'center',
                    color: 'black',
                    font: {
                        size: 23,
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x',
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${y_label}: ${tooltipItem.raw}`
                        }
                    }
                },
                legend: {
                    display: false
                },
                decimation: {
                    enabled: true,
                    algorithm: 'lttb', 
                    samples: 500,
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        align: 'center',
                        text: y_label,
                        color: 'black',
                        font: {
                            size: 18,
                        },
                    },
                    ticks: {
                        maxTicksLimit: 12,
                        color: 'black',
                        font: {
                            size: 14,
                        },
                    },
                },
                x: {
                    ticks: {
                        maxTicksLimit: 12,
                        color: 'black',
                        font: {
                            size: 14,
                        },
                    },
                    title: {
                        max: 1,
                        display: true,
                        align: 'center',
                        text: x_label,
                        color: 'black',
                        font: {
                            size: 18,
                        }
                    }
                }
            }
        }
    })
}

function createChartTwoLines(chartName, HTML_ID, title, x_data, y_data_1, y_1_label, y_data_2, y_2_label, x_label, y_label) { 
    chartName = document.getElementById(HTML_ID).getContext('2d');
    if (chartName.chart) {
        chartName.chart.destroy(); // Destroy the existing chart
    }
    let otherBlueLine = 'rgba(75, 180, 230, 0.9)'
    let otherBlueFill = 'rgba(75, 180, 230, 0.3)'
    let yellowFill = 'rgba(255, 191, 0, 0.2)'
    let yellowLine = 'rgba(255, 191, 0, 1)'
    
    chartName.chart = new Chart(chartName, {
        type: 'line',
        data: {
            stacked: false,
            labels: x_data, 
            datasets: [{
                data: y_data_1,
                label: y_1_label,
                borderColor: otherBlueLine,
                backgroundColor: otherBlueFill,
                fill: true,
                tension: 0.4,
            },
            {
                data: y_data_2,
                label: y_2_label,
                borderColor: yellowLine,
                backgroundColor: yellowFill,
                fill: true,
                tension: 0.4,
            },
        ]
        },
        options: {
            layout: {
                padding: {
                    right: 25, 
                    left: 10,
                    bottom: 10,
                    top: 5,
                },
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    align: 'center',
                    color: 'black',
                    font: {
                        size: 23,
                    }
                },
                tooltip: {
                    enabled: true, 
                    mode: 'nearest',
                    intersect: false, 
                    axis: 'x',
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${y_label}: ${tooltipItem.raw}`
                        }
                    }
                },
                legend: {
                    display: true,
                },
                decimation: {
                    enabled: true,
                    algorithm: 'lttb',
                    samples: 500 
                }
            },
            scales: {
                y: {
                    ticks: {
                        maxTicksLimit: 12,
                        color: 'black',
                        font: {
                            size: 14,
                        },
                    },
                    title: {
                        display: true,
                        align: 'center',
                        text: y_label,
                        color: 'black',
                        font: {
                            size: 18,
                        },
                    },
                },
                x: {
                    ticks: {
                        maxTicksLimit: 12,
                        color: 'black',
                        font: {
                            size: 14,
                        }
                    },
                    title: {
                        max: 1,
                        display: true,
                        align: 'center',
                        text: x_label,
                        color: 'black',
                        font: {
                            size: 18,
                        }
                    }
                }
            }
        }
    })
}