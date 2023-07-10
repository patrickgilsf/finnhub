import 'dotenv/config';
import finnhub from "finnhub";
import {google} from 'googleapis';
import moment from 'moment';
import alphavantage from 'alphavantage';
import { Client } from "iexjs";
import axios from 'axios';


const FinnKey = process.env.FinnKey
const GoogleKey = process.env.GOOGLEKEY.split(String.raw`\n`).join('\n')
const GoogleEmail = process.env.GOOGLEEMAIL
const spreadsheetId = process.env.SpreadsheetId
const AlphaKey = process.env.AlphaKey
const IEX_TOKEN = process.env.IEX_TOKEN
const QuiverToken = process.env.QuiverToken

FinnKey && GoogleKey && GoogleEmail 
  ? console.log('all keys successfully loaded!')
  : console.log('errors importing kes!')

//finnkey stuff
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = FinnKey // Replace this
const finnhubClient = new finnhub.DefaultApi()

//google credentials
const auth = new google.auth.JWT(
  GoogleEmail,
  null,
  GoogleKey,
  [
    "https://www.googleapis.com/auth/spreadsheets"
  ],
  null
)

google.options({auth})
const sheets = google.sheets('v4');

//alpha vantage
const alpha = alphavantage({key: AlphaKey})

//IEX
const getIEX = (symbol) => {
  return new Promise((resolve, reject) => {
    // axios.request(`https://cloud.iexapis.com/stable/tops?token=${IEX_TOKEN}&symbols=${symbol}`)
    axios.request(`https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${IEX_TOKEN}`)
    .then(res => {
      resolve(res.data)
    })
    .catch(error => reject(error))
  })
} 



//first day of month
var date = new Date();
var firstDay = moment(new Date(date.getFullYear(), date.getMonth(), 1)).format('YYYY-MM-DD');


export {
  sheets,
  spreadsheetId,
  finnhubClient,
  alpha,
  getIEX,
  QuiverToken
}