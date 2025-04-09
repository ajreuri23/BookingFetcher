const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Telegram Bot Token and Chat ID (add these to .env file)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Date to check
const DATE_TO_CHECK = '2025-04-17';
const HOTEL_NAME = 'Ein Gedi Nature Lodge';

async function checkBookingAvailability() {
  try {
    // Make request to Booking.com GraphQL API
    const response = await axios({
      method: 'post',
      url: 'https://www.booking.com/dml/graphql?lang=en-us',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
      data: {
        "operationName": "AvailabilityCalendar",
        "variables": {
          "input": {
            "travelPurpose": 2,
            "pagenameDetails": {
              "countryCode": "il",
              "pagename": "ein-gedi-nature-lodge"
            },
            "searchConfig": {
              "searchConfigDate": {
                "startDate": DATE_TO_CHECK,
                "amountOfDays": 1
              },
              "nbAdults": 2,
              "nbRooms": 1
            }
          }
        },
        "extensions": {},
        "query": "query AvailabilityCalendar($input: AvailabilityCalendarQueryInput!) {\n  availabilityCalendar(input: $input) {\n    ... on AvailabilityCalendarQueryResult {\n      hotelId\n      days {\n        available\n         checkin      }    }   __typename  }\n}\n"
      }
    });

    // Extract data from response
    const data = response.data;
    console.log('Response received:', JSON.stringify(data, null, 2));

    // Check for availability
    if (data.data && 
        data.data.availabilityCalendar && 
        data.data.availabilityCalendar.days && 
        data.data.availabilityCalendar.days.length > 0) {
      
      // Find the day matching our target date
      const targetDay = data.data.availabilityCalendar.days.find(day => day.checkin === DATE_TO_CHECK);
      
      if (targetDay) {
        console.log(`Checking availability for ${DATE_TO_CHECK}: ${targetDay.available ? 'Available' : 'Not Available'}`);
        
        // If available, send Telegram message
        if (targetDay.available) {
          await sendTelegramMessage(`🎉 Good news! ${HOTEL_NAME} is now available for ${DATE_TO_CHECK}! 🏨 Book now: https://www.booking.com/hotel/il/ein-gedi-nature-lodge.html`);
          console.log('Telegram message sent successfully!');
        } else {
          console.log(`${HOTEL_NAME} is not available for ${DATE_TO_CHECK}. Will check again later.`);
        }
      } else {
        console.log(`Date ${DATE_TO_CHECK} not found in response.`);
      }
    } else {
      console.error('Unexpected response format:', data);
    }
  } catch (error) {
    console.error('Error checking availability:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not set. Please configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file.');
    return;
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await axios.post(telegramUrl, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    throw error;
  }
}

// Run the check immediately
checkBookingAvailability();

// Schedule to run every hour (adjust the interval as needed)
const CHECK_INTERVAL = 60 * 1000; // 1 minute in milliseconds
setInterval(checkBookingAvailability, CHECK_INTERVAL);

console.log(`Bot started! Checking availability for ${HOTEL_NAME} on ${DATE_TO_CHECK} every ${CHECK_INTERVAL/60000} minutes.`);