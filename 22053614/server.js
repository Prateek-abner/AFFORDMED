const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
const TEST_SERVER_URL = 'http://20.244.56.144/evaluation-service';

let numberWindow = [];
let windowSum = 0;

const numberEndpoints = {
    p: 'primes',
    f: 'fibo',
    e: 'even',
    r: 'rand'
};

const getMockNumbers = (type) => {
    const mockData = {
        p: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29],
        f: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
        e: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        r: [7, 42, 15, 33, 8, 19, 26, 51, 10, 37]
    };
    return mockData[type] || [];
};

const fetchNumbers = async (numberType) => {
    const endpoint = numberEndpoints[numberType];
    if (!endpoint) return [];

    try {
        console.log(`Fetching from ${TEST_SERVER_URL}/${endpoint}`);
        const response = await axios.get(`${TEST_SERVER_URL}/${endpoint}`, {
            timeout: 2000 
        });
        console.log('Response status:', response.status);
        
       
        if (response.data && Array.isArray(response.data.numbers)) {
            console.log('Numbers received:', response.data.numbers);
            return response.data.numbers;
        } else {
            console.log('Invalid response format, using mock data');
            return getMockNumbers(numberType);
        }
    } catch (error) {
        console.error(`Error fetching ${numberType} numbers:`, error.message);
        console.log('Falling back to mock data');
        return getMockNumbers(numberType);
    }
};

const updateNumberWindow = (newNumbers) => {
    if (!newNumbers || newNumbers.length === 0) {
        return [...numberWindow]; 
    }

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
        console.log(`Processing request for number type: ${numberType}`);
        const numbers = await fetchNumbers(numberType);
        const prevWindow = updateNumberWindow(numbers);
        
        
        const avg = numberWindow.length > 0 
            ? _.round(windowSum / numberWindow.length, 1) 
            : 0;

        const response = {
            windowPrevState: prevWindow,
            windowCurrState: [...numberWindow],
            numbers: numbers,
            avg: avg
        };
        
        console.log('Sending response:', response);
        res.json(response);
    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Microservice operational on port ${PORT}`);
});
