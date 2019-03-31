const tokens = require('./config');

// Firebase connexion
var firebase = require('firebase').initializeApp({
  serviceAccount: "./helloiss-service-account.json",
  databaseURL: "https://hello-iss.firebaseio.com/",
});
const database = firebase.database();

// Scraping libraries
const cheerio = require('cheerio');
const axios = require('axios');

// Cron jobs library
const scheduled = require("scheduled");

// Telegram bot setup
const TelegramBot = require('node-telegram-bot-api');
const Telegramtoken = tokens.telegram;

// Telegram bot
const bot = new TelegramBot(Telegramtoken, { polling: true });
let botMessage = 'Let me check, ask me in a minute.';
// position of the point where the first ISS was launched.
let botISSLatitude = 45.9645851;
let botISSLongitude = 63.3030541;

// Get ISS view oportunities on given location
bot.on('location', (msg) => {
 
  bot.sendMessage(msg.chat.id, msg.location.latitude);
  bot.sendMessage(msg.chat.id, msg.location.longitude);

  let userLatitude = msg.location.latitude;
  let userLongitude = msg.location.longitude;

  axios.get(`https://www.heavens-above.com/PassSummary.aspx?satid=25544&lat=${userLatitude}&lng=${userLongitude}&alt=0&tz=CET`)
    .then(response => {
      const $ = cheerio.load(response.data);

      let ISSPasses = `Next seeing opportunities in your current location:\n`;
      // TODO add bucle to reduce code
      //for (i=1; i <= 4; i++) {

        let date1 = $('.standardTable tbody tr:nth-of-type(1) td:nth-of-type(1) a').text();
        let time1 = $('.standardTable tbody tr:nth-of-type(1) td:nth-of-type(3)').text();
        let moreInfo1 = 'https://www.heavens-above.com/' + $('.standardTable tbody tr:nth-of-type(1) td:nth-of-type(1) a').attr('href');
        let ISSPass1 = date1 + ' at ' + time1 + '\nFor more info, see:\n' + moreInfo1 + '\n\n';

        let date2 = $('.standardTable tbody tr:nth-of-type(2) td:nth-of-type(1) a').text();
        let time2 = $('.standardTable tbody tr:nth-of-type(2) td:nth-of-type(3)').text();
        let moreInfo2 = 'https://www.heavens-above.com/' + $('.standardTable tbody tr:nth-of-type(2) td:nth-of-type(1) a').attr('href');
        let ISSPass2 = date2 + ' at ' + time2 + '\nFor more info, see:\n' + moreInfo2 + '\n\n';

        let date3 = $('.standardTable tbody tr:nth-of-type(3) td:nth-of-type(1) a').text();
        let time3 = $('.standardTable tbody tr:nth-of-type(3) td:nth-of-type(3)').text();
        let moreInfo3 = 'https://www.heavens-above.com/' + $('.standardTable tbody tr:nth-of-type(3) td:nth-of-type(1) a').attr('href');
        let ISSPass3 = date3 + ' at ' + time3 + '\nFor more info, see:\n' + moreInfo3 + '\n\n';

        let date4 = $('.standardTable tbody tr:nth-of-type(4) td:nth-of-type(1) a').text();
        let time4 = $('.standardTable tbody tr:nth-of-type(4) td:nth-of-type(3)').text();
        let moreInfo4 = 'https://www.heavens-above.com/' + $('.standardTable tbody tr:nth-of-type(4) td:nth-of-type(1) a').attr('href');
        let ISSPass4 = date4 + ' at ' + time4 + '\nFor more info, see:\n' + moreInfo4 + '\n\n';

         ISSPasses = ISSPasses + ISSPass1 + ISSPass2 + ISSPass3 + ISSPass4
        
      //}

      bot.sendMessage(msg.chat.id, ISSPasses);

    })
    .catch(error => {
      console.log('error', error);
    });

});

bot.on('message', (msg) => {
  // if (msg.text === 'Where is the ISS?' || msg.text === 'Andandara') {
    bot.sendMessage(msg.chat.id, botMessage);
    bot.sendLocation(msg.chat.id, latitude = botISSLatitude, longitude = botISSLongitude);
  // } 
  // else {
  //   bot.sendMessage(msg.chat.id, "Try asking me 'Where is the ISS?' or share your location to see when you can see the ISS");
  // }
});

const dailyJob = new scheduled({
  id: "dailyJob",
  pattern: "0 0 * * * *", // Execute once a day at midnight
  task: function initDaily() {
    getCrew();
    getCrewImg();
    getISSNews();
  }
}).start();

const minuteJob = new scheduled({
  id: "minuteJob",
  pattern: "*", // Execute once a minute
  task: function initEachMinute() {
    locateISS();
  }
}).start();

// Get crew info from NASA
function getCrew() {
  let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
      let crew = JSON.parse(xmlHttp.responseText).people;
      database.ref('cosmonaut/').set({
        crew
      });
    } else if (xmlHttp.readyState === 4 && xmlHttp.status === 404) {
      console.error("ERROR! 404");
      console.info(JSON.parse(xmlHttp.responseText));
    }
  };
  xmlHttp.open("GET", "http://api.open-notify.org/astros.json", true);
  xmlHttp.send();
}

// Get Crew Image
function getCrewImg() {
  axios.get('http://www.ariss.org/current-iss-crew.html')
    .then(response => {
      const $ = cheerio.load(response.data);
      const issCrewImg = 'http://www.ariss.org' + $('.galleryImageBorder').attr('src');

      database.ref('ISSCrewImage/').set({
        url: issCrewImg
      });
    })
    .catch(error => {
      console.log('error', error);
    });
}

// Get future expeditions
function getCrewImg() {
  axios.get('https://www.nasa.gov/mission_pages/station/expeditions/future.html')
    .then(response => {
      const $ = cheerio.load(response.data);
      const futureExpedition = $('.static-landing-page').html();

      database.ref('futureExpeditionInfo/').set({
        info: futureExpedition
      });
    })
    .catch(error => {
      console.log('error', error);
    });
}

//Get ISS news
function getISSNews() {
  axios.get('https://blogs.nasa.gov/spacestation/')
    .then(response => {
      const $ = cheerio.load(response.data);

      var news = {
        titles: [],
        urls: [],
        images: []
      };

      $('article header h2.entry-title a').each(function () {
        news.titles.push($(this).text());
      });
      $('article header h2.entry-title a').each(function () {
        news.urls.push($(this).attr('href'));
      });
      $('article .entry-content figure img').each(function () {
        news.images.push($(this).attr('src'));
      });
      database.ref('ISSNews/').set({
        news
      });
    })
    .catch(error => {
      console.log('error', error);
    });
}

// Get popular music in current country 
let getCountryMusic = countryName => {

  let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  let xmlHttp = new XMLHttpRequest()
  let url = `http://ws.audioscrobbler.com/2.0/?method=geo.gettoptracks&country=${countryName}&api_key=${tokens.audioscrobbler}&format=json`

  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
      let mostListenedSong = JSON.parse(xmlHttp.responseText);

      let mostListenedSongName;
      let mostListenedSongArtist;
      let mostListenedSongUrl;
      let mostListenedSongImage;

      if (mostListenedSong.error) {
        // i.e.: Cocos [Keeling] Islands
        console.error(`error: ${mostListenedSong.error}, ${mostListenedSong.message}`);
      } else if (mostListenedSong.tracks.track[0] !== undefined && mostListenedSong.tracks.track[0].name && mostListenedSong.tracks.track[0].artist.name && mostListenedSong.tracks.track[0].url && mostListenedSong.tracks.track[0].image[2]["#text"]) {
        // If there is song info

        mostListenedSongName = mostListenedSong.tracks.track[0].name;
        mostListenedSongArtist = mostListenedSong.tracks.track[0].artist.name;
        mostListenedSongUrl = mostListenedSong.tracks.track[0].url;
        mostListenedSongImage = mostListenedSong.tracks.track[0].image[2]["#text"];

        database.ref('song/').set({
          name: mostListenedSongName,
          artist: mostListenedSongArtist,
          url: mostListenedSongUrl,
          image: mostListenedSongImage
        });

      }
      // Empty song values
      else {
        //i.e.: British Indian Ocean Territory
        console.log(`empty song values for ${countryName}`);
        database.ref('song/').set({
          name: '',
          artist: '',
          url: '',
          image: ''
        });
      }

    } else if (xmlHttp.readyState === 4 && xmlHttp.status === 404) {
      console.error("ERROR! 404");
      console.info(JSON.parse(xmlHttp.responseText));
    }
  };
  xmlHttp.open("GET", url, true);
  xmlHttp.send();
}

// Get Country Code for ISS location
let getCountryCode = url => {
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  var xmlHttp = new XMLHttpRequest();

  xmlHttp.onreadystatechange = function () {

    if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
      let ISSCountryLocation = JSON.parse(xmlHttp.responseText);

      if (ISSCountryLocation.geonames && ISSCountryLocation.geonames[0] !== undefined) {

        console.log(ISSCountryLocation);

        let ISScountryCode;
        let ISScountryName;
        let ISStoponymName;

        // Check and set country code, country name and toponym name
        if (ISSCountryLocation.geonames[0].countryCode && ISSCountryLocation.geonames[0].countryName && ISSCountryLocation.geonames[0].adminName1) {

          ISScountryCode = ISSCountryLocation.geonames[0].countryCode;
          ISScountryName = ISSCountryLocation.geonames[0].countryName;
          ISStoponymName = ISSCountryLocation.geonames[0].adminName1;

          console.log(`countryCode: ${ISScountryCode}, countryName: ${ISScountryName}, toponymName: ${ISStoponymName}`);

          // message to be sent by Telegram's bot
          botMessage = `The ISS is flying over ${ISStoponymName} (${ISScountryName}).`;

          database.ref('currentCountry/').set({
            code: ISScountryCode,
            name: ISScountryName,
            toponym: ISStoponymName
          });

          getCountryMusic(ISScountryName);

          // We miss one of the required country's data
        } else {
          console.log('No hay ISScountryCode, ISScountryName o ISStoponymName');
        }
        // There is no country location info
      } else {
        console.log('agua');
        // message to be sent by Telegram's bot
        botMessage = `The ISS is flying somewhere over the sea.`;
      }


    } else if (xmlHttp.readyState === 4 && xmlHttp.status === 404) {
      console.error("ERROR! 404");
      console.info(JSON.parse(xmlHttp.responseText));
    }
  };
  xmlHttp.open("GET", url, true);
  xmlHttp.send();
}

// Get ISS current location
// execute once a minute
function locateISS() {

  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  var xmlHttp = new XMLHttpRequest();

  xmlHttp.onreadystatechange = function () {

    if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
      let ISSlocation = JSON.parse(xmlHttp.responseText);
      if (ISSlocation.message === 'success') {
        // get ISS latitude and longitude
        let ISSlatitude = ISSlocation.iss_position.latitude;
        let ISSlongitude = ISSlocation.iss_position.longitude;

        botISSLatitude = ISSlatitude;
        botISSLongitude = ISSlongitude;

        // getCountry based on latitude and longitude
        let countryCodeUrl = `http://api.geonames.org/findNearbyJSON?username=${tokens.geonames}&lat=${ISSlatitude}&lng=${ISSlongitude}`;

        const latlon = `${ISSlatitude},${ISSlongitude}`;
        // TODO Mostrar recorrido
        // TODO show a ISS logo in the map
        const img_url = `https://maps.googleapis.com/maps/api/staticmap?center=${latlon}&zoom=5&size=400x300&sensor=false&key=${tokens.gmaps}`;

        database.ref('currentPosition/').set({
          urlMap: img_url
        });
        getCountryCode(countryCodeUrl);
      }

    } else if (xmlHttp.readyState === 4 && xmlHttp.status === 404) {
      console.error("ERROR! 404");
      console.info(JSON.parse(xmlHttp.responseText));
    }
  };
  xmlHttp.open("GET", 'http://api.open-notify.org/iss-now.json', true);
  xmlHttp.send();
}
