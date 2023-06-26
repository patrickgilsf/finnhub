import {
  sheets,
  spreadsheetId,
  finnhubClient,
  alpha
} from './config.js'

//rate limiting delay
const delay = time => new Promise(res=>setTimeout(res,time));

const calculateGL = (today, total, buy) => {
  let todayVal = Number(today) * Number(total);
  let buyVal = Number(buy) * Number(total);
  // console.log(todayVal, buyVal);  
  return Math.round((todayVal - buyVal) * 100) / 100;
}


const getStocks = async () => {
  try {
    console.log('getting stock symbols from Google APIs')
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'stockData'
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
  // console.log(totalData);
  for (let stock of totalData) {
    console.log(`Getting data for ${stock.Symbol}`);

    //math for personal positions
    if (stock.Owned == "TRUE") {
      stock['Gain Loss'] = calculateGL(stock['Price Today'], stock['Total Shares'], stock['Price at Buy']);
      // console.log(`gain loss for ${stock.Symbol}: ${stock['Gain Loss']}`);
    }

    //stocks only processing
    if (stock.Type == "Stock") {

      //get stock name and hyper link
      let profile = await getProfile(stock.Symbol);
      stock.Name = `=HYPERLINK("${profile.weburl}", "${profile.name}")`;

      //get stock price
      let price = await getPrice(stock.Symbol);
      stock['Price Today'] = price.c;

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