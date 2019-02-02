
var firebase = require('firebase').initializeApp({
 serviceAccount: "./helloiss-service-account.json",
 databaseURL: "https://hello-iss.firebaseio.com/",
});

const cheerio = require ('cheerio');
const axios = require('axios');

let database = firebase.database();

// Get Crew Image
// Execute once a day
setInterval(
    function getCrewImg() {
    axios.get('http://www.ariss.org/current-iss-crew.html')
    .then(response => {
        const $ = cheerio.load(response.data);
        const issCrewImg = 'http://www.ariss.org' + $('.galleryImageBorder').attr('src');

        firebase.database().ref('ISSCrewImage/').set({
            url: issCrewImg
        });

        
    })
    .catch(error => {
        console.log('error', error);
    });
}, 86400000);


// Get Country Code for ISS location
let getCountryCode = url => {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xmlHttp = new XMLHttpRequest();
    
    xmlHttp.onreadystatechange = function() {
  
        if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
          let ISSCountryLocation = JSON.parse(xmlHttp.responseText);
          
          // is there a geoName?
          if (ISSCountryLocation.geonames[0]) {
            let ISScountryCode = ISSCountryLocation.geonames[0].countryCode;
            let ISScountryName = ISSCountryLocation.geonames[0].countryName;
            // document.getElementById('countryCode').innerText = `${ISScountryName}: ${ISScountryCode}`;
            // send countryCode to database.
            firebase.database().ref('currentCountry/').set({
              code: ISScountryCode
            });
          }
          else {
            console.log('agua');
        
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
  setInterval(
  function locateISS() {

    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xmlHttp = new XMLHttpRequest();
    
    xmlHttp.onreadystatechange = function() {
  
        if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
          let ISSlocation = JSON.parse(xmlHttp.responseText);
          if(ISSlocation.message === 'success'){
            const USERNAME = 'sergitxu';
            // get ISS latitude and longitude
            let ISSlatitude = ISSlocation.iss_position.latitude;
            let ISSlongitude = ISSlocation.iss_position.longitude;
  
            // getCountry based on latitude and longitude
            let countryCodeUrl = `http://api.geonames.org/findNearbyJSON?username=${USERNAME}&lat=${ISSlatitude}&lng=${ISSlongitude}`;
  
            const latlon = `${ISSlatitude},${ISSlongitude}`;
            // TODO show real map? Cuidado si cobran
            // TODO Mostrar recorrido
            // TODO show a ISS logo in the map
            // Show position in a map
            const googleMapsKey = "AIzaSyApZj382B_afAx4ecNtytJFhvWhTf9WvWw";
            const img_url = `https://maps.googleapis.com/maps/api/staticmap?center=${latlon}&zoom=5&size=400x300&sensor=false&key=${googleMapsKey}`;

            firebase.database().ref('currentPosition/').set({
                urlMap: img_url
              });

            // document.getElementById('positionMap').src = `${img_url}`;
            getCountryCode(countryCodeUrl);
          }
          
        } else if (xmlHttp.readyState === 4 && xmlHttp.status === 404) {
            console.error("ERROR! 404");
            console.info(JSON.parse(xmlHttp.responseText));
        }
    };
    xmlHttp.open("GET", 'http://api.open-notify.org/iss-now.json', true);
    xmlHttp.send();
  }, 1000);

//(function(){

  // https://blogs.nasa.gov/spacestation/feed/
  // news regarding ISS parse RSS xml

  // from https://www.nasa.gov/mission_pages/station/expeditions/index.html
 // var crewImage = document.querySelector("div#cards div.bg-card-canvas").style.backgroundImage;
 
 // var missionOverview = document.querySelector("div#ember1127 div div p");
  // var currentMission = meta twitter:title;
 // document.getElementById('currentMissionBadge').src = 'https://www.nasa.gov/sites/default/files/styles/1x1_cardfeed/public/thumbnails/image/iss057-s-001b.jpg';


//})();
