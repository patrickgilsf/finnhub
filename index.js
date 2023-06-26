import {
  sheets,
  spreadsheetId,
  finnhubClient,
  alpha
} from './config.js'

//rate limiting delay
const delay = time => new Promise(res=>setTimeout(res,time));

const getStocks = async () => {
  try {
    console.log('getting stock symbols from Google APIs')
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'stockData'
      }, (err, res) => {
        // let stocks = res.data.values.map(([a]) => a);
        // err ? console.log(err) : resolve(stocks)
        err ? console.log(err) : resolve(res.data.values);
      })
    })
  } catch(err) {reject(err)}
}

const getStockRec = async (stock) => {
  return new Promise((resolve, reject) => {
    finnhubClient.recommendationTrends(stock, (error, data, response) => {
      error ? reject(error) : resolve(data)
    })
  })
}

const getFinancials = async (stock) => {
  return new Promise((resolve, reject) => {
    try {
      alpha.fundamental.company_overview(stock)
      .then((data) => data ? resolve(data) : console.log(`error getting data for ${stock}`))
    }
    catch {e => reject(e)};
  })
}

const getRecData = async () => {
  let totalData = [];
  const stockArray = await getStocks();
  let keys = stockArray[0];
  for (let row of stockArray) {
    let stockObj = {};
    for (let i = 0; i < row.length; i++) {
      stockObj[keys[i]] = row[i];
    };
    totalData.push(stockObj);
  }
  totalData = totalData//.splice(1, totalData.length);

  for (let stock of totalData) {
    console.log(`Getting data for ${stock.Symbol}`)
    if (stock.Type == "Stock") {

      //get stock recs
      let recs = await getStockRec(stock.Symbol);
      let recent = recs[0];
      stock.Buy = recent.buy;
      stock.Hold = recent.hold;
      stock.Sell = recent.sell;
      stock['Strong\nBuy'] = recent.strongBuy;
      stock['Strong\nSell'] = recent.strongSell;
      stock['Last Ratings\nUpdate'] = recent.period;

      //get financials
      
      let fin = await getFinancials(stock.Symbol);
      if (fin) {
        // console.log(fin);
        stock.Sector = fin.Sector;
        stock['Price to Earnings'] = fin.PERatio;
        stock['Price to Book Value'] = fin.PriceToBookRatio;
        stock['Dividend Yield'] = fin.DividendYield;
        stock.EBITDA = fin.EBITDA;
        stock['EV to Ebitda'] = fin.EVToEBITDA;
        stock['Earnings Per Share'] = fin.EPS;
        stock['Price to Sales Ratio'] = fin.PriceToSalesRatioTTM;
        stock['PEG Ratio'] = fin.PEGRatio;

      }
      await delay(20000); //alpha vantage api rate limit is 5/second on free tier
    }
  }
  // console.log(totalData);
  return await totalData;
}

const postToGoogle = async (inputData) => {
  // let inputData = await getRecData();
  console.log(inputData)
  sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'stockData',
    valueInputOption: 'USER_ENTERED',
    includeValuesInResponse: true,
    resource: {
      values: inputData
    }
  }, (err, res) => {
    !err ? console.log(`Update succeeded with code ${res.status}!`) : console.log(err);
  })
}

const main = async () => {
  let data = await getRecData();
  // console.log(data);
  let googleData = [];
  for (let row of data) {
    googleData.push(Object.values(row))
  }
  // console.log(googleData);
  postToGoogle(googleData);
}

await main();