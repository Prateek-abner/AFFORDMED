const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
const TEST_SERVER_URL = 'http://20.244.56.144/evaluation-service';
const FETCH_TIMEOUT = 500;

let authToken = null;
const clientCredentials = {
  email: "ramkrishna@abc.edu",
  name: "ram krishna",
  rollNo: "aalbb",
  accessCode: "xgAsNC",
  clientID: "d9cbb699-6a27-44a5-8d59-8b1befa816da",
  clientSecret: "tVJaaaRBSeXcRXeM"
};

let numberWindow = [];
let windowSum = 0;

const numberEndpoints = {
  p: 'primes',
  f: 'fibo',
  e: 'even',
  r: 'rand'
};

async function authenticate() {
  try {
    const response = await axios.post(`${TEST_SERVER_URL}/auth`, clientCredentials);
    if (response.data && response.data.access_token) {
      authToken = response.data.access_token;
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function fetchNumbers(numberType) {
  if (!authToken && !(await authenticate())) return [];

  const endpoint = numberEndpoints[numberType];
  if (!endpoint) return [];

  try {
    const response = await axios.get(`${TEST_SERVER_URL}/${endpoint}`, {
      headers: {'Authorization': `Bearer ${authToken}`},
      timeout: FETCH_TIMEOUT
    });

    if (response.data && Array.isArray(response.data.numbers)) {
      return response.data.numbers;
    }
    return [];
  } catch (error) {
    if (error.response && error.response.status === 401) {
      authToken = null;
      await authenticate();
    }
    return [];
  }
}

const updateNumberWindow = (newNumbers) => {
  if (!newNumbers || newNumbers.length === 0) return [...numberWindow];

  const uniqueNewNumbers = _.uniq(newNumbers);
  const previousWindow = [...numberWindow];

  uniqueNewNumbers.forEach(num => {
    if (!numberWindow.includes(num)) {
      if (numberWindow.length >= WINDOW_SIZE) {
        const removedNum = numberWindow.shift();
        windowSum -= removedNum;
      }
      numberWindow.push(num);
      windowSum += num;
    }
  });

  return previousWindow;
};

app.get('/numbers/:numberType', async (req, res) => {
  const numberType = req.params.numberType;

  if (!Object.keys(numberEndpoints).includes(numberType)) {
    return res.status(400).json({ error: 'Invalid number type specified' });
  }

  try {
    const prevWindow = [...numberWindow];
    const numbers = await fetchNumbers(numberType);
    updateNumberWindow(numbers);
    
    const avg = numberWindow.length > 0
      ? _.round(windowSum / numberWindow.length, 2)
      : 0;

    res.json({
      windowPrevState: prevWindow,
      windowCurrState: [...numberWindow],
      numbers: numbers,
      avg: avg
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

(async function() {
  await authenticate();
  app.listen(PORT, () => {
    console.log(`Average Calculator microservice running on port ${PORT}`);
  });
})();
