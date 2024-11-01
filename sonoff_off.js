import axios from 'axios'

let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'http://172.20.10.2/?m=1',
    headers: { }
};

axios.request(config)
.then((response) => {
    let html = JSON.stringify(response.data)
    const pattern = /font-size:62px'>(\w+)<\/td>/; 
    const match = html.match(pattern);

    if (match) {
        const result = match[1]
        console.log(result)
    } else {
        console.log('No match found')
    }
  })
.catch((error) => {
    console.log(error);
})