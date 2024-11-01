import axios from 'axios'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const dataFile = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/inverter_data.json'
const serialNumber = process.env.SERIALNUMBER
const bearerToken = process.env.BEARERTOKEN

getData()

async function getData() {
    let config
    let key = ''
    let i = ''
    let j = 1
    let moreData = true
    let range = ''
    let finalData = {}
    let today = new Date()
    let dateF = []
    let noOfDays = 8
    let dateRange = []
    let iStart = 1
    let end = 7

    // create array of dates to fetch
    for(let i = iStart; i < noOfDays; i++) {
        let date = new Date();
        date.setDate(today.getDate() - i)
        dateF = date.toISOString().split('T')[0]
        dateRange.push(dateF)
        console.log('dateF', dateF)
    }
    dateRange.reverse()

    for(range = 0; range < end; range++) {
        console.log('date range', dateRange[range])
    
        // for loop runs to get all pages of data from one date
        for(i = 1; i <= j; i++) { 
            if(i === 1) {
                config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: `https://api.sunsynk.net/api/v1/workdata/dynamic?page=1&limit=10&sn=${serialNumber}&dateRange=${dateRange[range]},${dateRange[range]}&type=1&lan=en`,
                    headers: { 
                        'Authorization': `Bearer ${bearerToken}`,
                        'Accept': 'application/json'
                    }
                }
                
            }
            else if(moreData) {
                config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: `https://api.sunsynk.net/api/v1/workdata/dynamic?page=${i}&limit=10&sn=${serialNumber}&dateRange=${dateRange[range]},${dateRange[range]}&type=1&lan=en&nextStartPrimaryKey=${key}`,
                    headers: { 
                        'Authorization': `Bearer ${bearerToken}`,
                        'Accept': 'application/json'
                    }
                }
            }
            try {
                let response = await axios.request(config)
                finalData[`day_${range}_page_${i}`] = response.data.data  // store 
                console.log(`day_${range}_page_${i}`)
                
                // reached end of data for that day but there are NO more days to fetch data for
                if(((response.data.data.nextPrimaryKey) === null) && (dateRange[range] === dateRange[(dateRange.length)-1])) {
                    j = 0 // second for loop won't run
                    console.log('all data fetched')
                }    
                // reached end of a day, but there are more days to fetch
                else if(((response.data.data.nextPrimaryKey) === null) && (dateRange[range] > dateRange[(dateRange.length)-1])) {
                    j = 1 // go back to page 1
                    console.log('no days')
                }
                // reached end of data for the day, but there are more days to fetch
                else if(((response.data.data.nextPrimaryKey) === null) && (dateRange[range] < dateRange[(dateRange.length)-1])) {
                    moreData = false;
                    j = 1
                    console.log('next day ->')
                }
                // if the response was good, and there are more pages in today
                else if((response.data.data.nextPrimaryKey) != null){
                    moreData = true;
                    j++
                    key = response.data.data.nextPrimaryKey.replace(/ /g, "+")
                    console.log('next page')
                }
                // escape route :)
                else {
                    console.log('something went wrong')
                    j = 0 // for loops won't run
                    range = 10 // will only ever be 4 elements in range
                }
            }
            catch (error) {
                // if (error.response) {
                //     console.error('Error response:', error.response.data);
                //     console.error('Status code:', error.response.status);
                // } else {
                //     console.error('Error message:', error.message);
                // }
            }
        }
    }
    fs.writeFile(dataFile, JSON.stringify(finalData), (err) => {
        if (err) {
            console.log('error writing', err)
        }
        else {
            console.log('written')
        }
    })
    return finalData
}