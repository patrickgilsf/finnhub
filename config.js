import 'dotenv/config';
import finnhub from "finnhub";
import WebSocket, { WebSocketServer } from 'ws';
import robinhood from 'robinhood';
import axios from 'axios';
import {google} from 'googleapis';
import moment from 'moment';
import googleFinance from 'google-finance';
import yahooFinance from 'yahoo-finance';


const FinnKey = process.env.FinnKey
const RHEmail = process.env.RHEmail
const RHPW = process.env.RHPW
const RHKey = process.env.RHKey
const GoogleKey = process.env.GoogleKey
const GoogleEmail = process.env.GoogleEmail
const spreadsheetId = process.env.SpreadsheetId
console.log(GoogleEmail);

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

//first day of month
var date = new Date();
var firstDay = moment(new Date(date.getFullYear(), date.getMonth(), 1)).format('YYYY-MM-DD');



console.log('config file deployed')
export {
  sheets,
  spreadsheetId,
  finnhubClient,
  firstDay,
  googleFinance,
  yahooFinance
}