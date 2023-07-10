import axios from 'axios';
import {
  sheets,
  spreadsheetId,
  finnhubClient,
  alpha,
  getIEX,
  QuiverToken
} from './config.js'

//rate limiting delay
const delay = time => new Promise(res=>setTimeout(res,time));

//calculates unrealized gain and loss
const calculateGL = (today, total, buy) => {
  let todayVal = Number(today) * Number(total);
  let buyVal = Number(buy) * Number(total);
  // console.log(todayVal, buyVal);  
  return Math.round((todayVal - buyVal) * 100) / 100;
}

//pull current data from Google
const getGoogleData = async (range) => {
  try {
    console.log('getting stock symbols from Google APIs')
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      }, (err, res) => {
        err ? console.log(err) : resolve(res.data.values);
      })
    })
  } catch(err) {reject(err)}
}

const getProfile = (stock) => {
  return new Promise((resolve, reject) => {
    finnhubClient.companyProfile2({'symbol': stock}, (error, data, response) => {
      error ? reject(error) : resolve(data);
    })
  })
};

const getPrice = async (stock) => {
  return new Promise((resolve, reject) => {
    finnhubClient.quote(stock, (error, data, response) => {
      error ? reject(error) : resolve(data)
    })
  })
};

const getStockRec = async (stock) => {
  return new Promise((resolve, reject) => {
    finnhubClient.recommendationTrends(stock, (error, data, response) => {
      error ? reject(error) : resolve(data)
    })
  })
};

const getFinancials = async (stock) => {
  return new Promise((resolve, reject) => {
    try {
      alpha.fundamental.company_overview(stock)
      .then((data) => data ? resolve(data) : console.log(`error getting data for ${stock}`))
    }
    catch {e => reject(e)};
  })
};

//get api call from quiver api
const quiverAPI = async (url) => {
  return new Promise((resolve, reject) => {
      axios.request(url, {headers: {
        accept: "application/json",
        "X-CSRFToken": "TyTJwjuEC7VV7mOqZ622haRaaUr0x0Ng4nrwSRFKQs7vdoBcJlK9qjAS69ghzhFu",
        Authorization: `Token ${QuiverToken}`
      }})
      .then(res => {
        resolve(res.data)
      })
      .catch(e => {reject(e)})
  })
}

//get congressional trading
const getCongress = async () => {
  let rtn = [];
  let con = await quiverAPI('https://api.quiverquant.com/beta/live/congresstrading');
  for (let stock of con) {
    stock.Amount > 100000 ? rtn.push(stock) : null;
  };
  return rtn;
}


const getRecData = async () => {
  let totalData = [];
  const stockArray = await getGoogleData('stockData');
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
    console.log(`Getting data for ${stock.Symbol}`);

    //math for personal positions
    if (stock.Owned == "TRUE") {
      stock['Gain Loss'] = calculateGL(stock['Price Today'], stock['Total Shares'], stock['Price at Buy']);
    }

    //stocks only processing
    if (stock.Type == "Stock") {

      //get stock name and hyper link
      let profile = await getProfile(stock.Symbol);
      stock.Name = `=HYPERLINK("${profile.weburl}", "${profile.name}")`;

      //get stock price
      let price = await getPrice(stock.Symbol);
      // stock['Price Today'] = price.c;
      

      //get stock recs
      let recs = await getStockRec(stock.Symbol);
      let recent = recs[0];
      stock.Buy = recent.buy;
      stock.Hold = recent.hold;
      stock.Sell = recent.sell;
      stock['Strong\nBuy'] = recent.strongBuy;
      stock['Strong\nSell'] = recent.strongSell;
      stock['Last Ratings\nUpdate'] = recent.period;
      stock['Price Today'] = `=GOOGLEFINANCE("${stock.Symbol}", "price")`

      //get financials
      let fin = await getFinancials(stock.Symbol);
      if (fin) {
        // console.log(fin);
        stock.Sector = fin.Sector;
        stock['Price to Earnings'] = fin.PERatio ? fin.PERatio : 'No Info';
        stock['Price to Book Value'] = fin.PriceToBookRatio ? fin.PriceToBookRatio : 'No Info';
        stock['Dividend Yield'] = fin.DividendYield ? fin.DividendYield : 'No Info';
        stock.EBITDA = fin.EBITDA ? fin.EBITDA : 'No Info';
        stock['EV to Ebitda'] = fin.EVToEBITDA ? fin.EVToEBITDA : 'No Info';
        stock['Earnings Per Share'] = fin.EPS ? fin.EPS : 'No Info';
        stock['Price to Sales Ratio'] = fin.PriceToSalesRatioTTM ? fin.PriceToSalesRatioTTM : 'No Info';
        stock['PEG Ratio'] = fin.PEGRatio ? fin.PEGRatio : 'No Info';
      };
      // console.log(stock);
      await delay(20000); //alpha vantage api rate limit is 5/second on free tier
    };

    //ETF hyperlink data
    if (stock.Type == "ETF") {
      stock['Price Today'] = `=GOOGLEFINANCE("${stock.Symbol}", "price")`;
    }
    //ETF profiles, commented out because I don't have a premium account
    // if (stock.Type == "ETF") {
    //   let etf = await getIEX(stock.Symbol);
    //   stock['Price Today'] = etf.latestPrice;
    //   await delay(20000);
    // }

  }

  return await totalData;
}

const postToGoogle = async (inputData, range) => {
  sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    includeValuesInResponse: false,
    resource: {
      values: inputData
    }
  }, (err, res) => {
    !err ? console.log(`Update succeeded with code ${res.status}!`) : console.log(err);
  })
}

const main = async () => {
  //sheet 1
  let data = await getRecData();
  let googleData = [];
  for (let row of data) {
    googleData.push(Object.values(row))
  }
  // console.log(googleData);
  postToGoogle(googleData, 'stockData');

  //sheet 2
  let totalData = [];
  let cData = await getGoogleData('congressData');
  totalData.push(cData[0]);

  
  let congress = await getCongress();
  for (let trade of congress) {
    console.log(`Getting data ${trade.Representative} trade data...`)
    let profile = await getProfile(trade.Ticker);
    totalData.push([
      trade.Representative,
      trade.TransactionDate,
      trade.Ticker,
      `=HYPERLINK("${profile.weburl}", "${profile.name}")`,
      trade.Transaction,
      trade.Amount
    ]);
    await delay(20000);
  }
  postToGoogle(totalData, 'congressData')


}

await main();


