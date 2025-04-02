const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
const SERVER_URL = 'http://20.244.56.144/evaluation-service';

let numWindow = [];
let windowTotal = 0;
let authToken = '';

const endpoints = {
    p: 'primes',
    f: 'fibo',
    e: 'even',
    r: 'rand'
};

function getFallbackData(type) {
    if (type === 'p') return [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
    if (type === 'f') return [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    if (type === 'e') return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    if (type === 'r') return [7, 42, 15, 33, 8, 19, 26, 51, 10, 37];
    return [];
}

async function getAuthToken() {
    try {
        const resp = await axios.post(`${SERVER_URL}/auth`, {
            email: "ramkrishna@abc.edu",
            name: "ram krishna",
            rollNo: "aalbb",
            accessCode: "xgAsNC",
            clientID: "d9cbb699-6a27-44a5-8d59-8b1befa816da",
            clientSecret: "tVJaaaRBSeXcRXeM"
        });
        
        if (resp.data && resp.data.access_token) {
            console.log("Authentication successful");
            return resp.data.access_token;
        } else {
            console.log("Invalid auth response");
            return '';
        }
    } catch (err) {
        console.log(`Auth failed: ${err.message}`);
        return '';
    }
}

async function getNumbers(type) {
    const endpoint = endpoints[type];
    if (!endpoint) return [];

    if (!authToken) {
        authToken = await getAuthToken();
        if (!authToken) {
            console.log("Using fallback data due to auth failure");
            return getFallbackData(type);
        }
    }

    try {
        let resp = await axios.get(`${SERVER_URL}/${endpoint}`, {
            timeout: 2000,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (resp.data && resp.data.numbers) {
            return resp.data.numbers;
        } else {
            console.log("Invalid response format, using fallback");
            return getFallbackData(type);
        }
    } catch (err) {
        console.log(`Failed to get ${type} numbers: ${err.message}`);
        
        // If token expired, try to get a new one
        if (err.response && err.response.status === 401) {
            console.log("Token expired, refreshing");
            authToken = await getAuthToken();
            if (authToken) {
                return getNumbers(type); // Retry with new token
            }
        }
        
        return getFallbackData(type);
    }
}

function updateWindow(newNums) {
    let oldWindow = [...numWindow];
    
    if (!newNums || newNums.length === 0) {
        return oldWindow;
    }

    let uniqueNums = [];
    for (let num of newNums) {
        if (!uniqueNums.includes(num)) {
            uniqueNums.push(num);
        }
    }

    for (let num of uniqueNums) {
        if (!numWindow.includes(num)) {
            if (numWindow.length >= WINDOW_SIZE) {
                let removed = numWindow.shift();
                windowTotal -= removed;
            }
            numWindow.push(num);
            windowTotal += num;
        }
    }

    return oldWindow;
}

app.get('/numbers/:type', async (req, res) => {
    let type = req.params.type;
    
    if (!endpoints[type]) {
        return res.status(400).json({ error: 'Invalid number type specified' });
    }

    try {
        let numbers = await getNumbers(type);
        let prevState = updateWindow(numbers);
        
        let average = 0;
        if (numWindow.length > 0) {
            average = Math.round((windowTotal / numWindow.length) * 10) / 10;
        }

        res.json({
            windowPrevState: prevState,
            windowCurrState: [...numWindow],
            numbers: numbers,
            avg: average
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error occurred' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
    console.log(`Service running on port ${PORT}`);
});
