import {
  sheets,
  spreadsheetId,
  finnhubClient,
  firstDay
} from './config.js'

const getStocks = async () => {
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'MyStocks'
    }, (err, res) => {
      let stocks = res.data.values.map(([a]) => a);
      err ? console.log(err) : resolve(stocks)
    })
  })
}

const getStockRec = async (stock) => {
  return new Promise((resolve, reject) => {
    finnhubClient.recommendationTrends(stock, (error, data, response) => {
      error ? reject(error) : resolve(data)
    })
  })
}
const getRecData = async () => {
  let totalData = [];
  const stocks = await getStocks();
  for (let stock of stocks) {
    let data = await getStockRec(stock);
    let recentData = data.filter(a => a.period == firstDay).length;
    totalData.push([
      recentData.buy,
      recentData.hold,
      recentData.sell,
      recentData.strongBuy,
      recentData.strongSell
    ]);
  }
  return await totalData
}

const postToGoogle = async () => {
  let inputData = await getRecData();
  // console.log(inputData)
  sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'RecData',
    valueInputOption: 'USER_ENTERED',
    includeValuesInResponse: true,
    resource: {
      values: inputData
    }
  }, (err, res) => {
    !err ? console.log(`Update succeeded with code ${res.status}!`) : console.log(err);
  })
}

postToGoogle()







// //robinhood stuff
// const credentials = {
//   username: RHEmail,
//   password: RHPW
// }
// const token = {
//   token: RHKey
// }
// const RHUrl = 'https://api.robinhood.com/'

// var Robinhood = robinhood(token, (err, data) => {
//     Robinhood.positions((err, res, body) => {
//       for (let url of body.results) {
//         console.log(url.url)
//       }
//   })
// });