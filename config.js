import 'dotenv/config'
import finnhub from "finnhub"
import WebSocket, { WebSocketServer } from 'ws';

const FinnKey = process.env.FinnKey

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = FinnKey // Replace this
const finnhubClient = new finnhub.DefaultApi()

// // Stock candles
// finnhubClient.stockCandles("AAPL", "D", 1590988249, 1591852249, (error, data, response) => {
//     console.log(data)
// });

// // Basic financials
// finnhubClient.companyBasicFinancials("AAPL", "margin", (error, data, response) => {
//   console.log(data)
// });

// // General news
// finnhubClient.marketNews("general", {}, (error, data, response) => {
//   console.log(data)
// });


//websocket
// const socket = new WebSocket(`wss://ws.finnhub.io?token=${FinnKey}`);
// // Connection opened -> Subscribe
// socket.addEventListener('open', function (event) {
//   socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'AAPL'}))
//   socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'BINANCE:BTCUSDT'}))
//   socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'IC MARKETS:1'}))
// });

// // Listen for messages
// socket.addEventListener('message', function (event) {
//   console.log('Message from server ', event.data);
// });
// Unsubscribe
// var unsubscribe = function(symbol) {
//   socket.send(JSON.stringify({'type':'unsubscribe','symbol': symbol}))
// }