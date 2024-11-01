import axios from 'axios'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()
const dataFile = '/home/talialevin/Documents/Home_Energy_System/data_skripsie_nodered/one_day_inverter_data.json'
const serialNumber = process.env.SERIALNUMBER
const bearerToken = process.env.BEARERTOKEN

getData()

async function getData() {
    let config
    let key = ''
    let i = ''
    let j = 1
    let finalData = {}
    let today = new Date()
    let todayF = today.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' }).split('T')[0]  // today's date
    let range = 0
    let dateRange = [todayF]

    // for loop runs to get all pages of data from one date
    for(i = 1; i <= j; i++) { 
        if(i === 1) {
            config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://api.sunsynk.net/api/v1/workdata/dynamic?page=1&limit=10&sn=${serialNumber}&dateRange=${dateRange[range]},${dateRange[range]}&type=1&lan=en`,
                headers: { 
                    'Authorization': `Bearer ${bearerToken}`
                }
            }
        }
        else if(i > 1) {
            console.log('test')

            config = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `https://api.sunsynk.net/api/v1/workdata/dynamic?page=${i}&limit=10&sn=${serialNumber}&dateRange=${dateRange[range]},${dateRange[range]}&type=1&lan=en&nextStartPrimaryKey=${key}`,
                headers: { 
                    'Authorization': `Bearer ${bearerToken}`
                }
            }
        }
        try {
            let response = await axios.request(config)
            finalData[`day_${7}_page_${i}`] = response.data.data  // store 

            // reached end of data for that day but there are NO more days to fetch data for
            if(((response.data.data.nextPrimaryKey) === null) && (dateRange[range] === todayF)) {
                j = 0 // second for loop won't run
                console.log('all data fetched')
            }    

            // reached end of a day, but there are more days to fetch
            else if(((response.data.data.nextPrimaryKey) === null) && (dateRange[range] > todayF)) {
                j = 1 // go back to page 1
                console.log('next day ->')
            }
            // reached end of data for the day, but there are more days to fetch
            else if(((response.data.data.nextPrimaryKey) === null) && (dateRange[range] < todayF)) {
                j = 1
                console.log('')
            }
            // if the response was good, and there are more pages in today
            else if((response.data.data.nextPrimaryKey) != null){
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
            console.log(error);
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