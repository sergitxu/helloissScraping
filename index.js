
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

//Get ISS news

setInterval(
  function getISSNews() {
  axios.get('https://blogs.nasa.gov/spacestation/')
  .then(response => {
      const $ = cheerio.load(response.data);

      var news = {
          titles: [],
          urls: [],
          images: []
      };

      $('article header h2.entry-title a').each(function() {
        news.titles.push($(this).text());
      });
      $('article header h2.entry-title a').each(function() {
        news.urls.push($(this).attr('href'));      
      });
      $('article .entry-content figure img').each(function() {
        news.images.push($(this).attr('src'));       
      });
      firebase.database().ref('ISSNews/').set({
        news
      });
  })
  .catch(error => {
      console.log('error', error);
  });
}, 86400000);

// Get popular music in current country 
let getCountryMusic = countryName => {

  let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  let xmlHttp = new XMLHttpRequest()
  let url = `http://ws.audioscrobbler.com/2.0/?method=geo.gettoptracks&country=${countryName}&api_key=0b60a68567872af2073bd9efe40081de&format=json`


  xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
        let mostListenedSong = JSON.parse(xmlHttp.responseText);
        
        let mostListenedSongName;
        let mostListenedSongArtist;
        let mostListenedSongUrl;
        let mostListenedSongImage;

		// If there is song info
		if(mostListenedSong.tracks.track[0] !== undefined){
			
				mostListenedSongName = mostListenedSong.tracks.track[0].name;
				mostListenedSongArtist = mostListenedSong.tracks.track[0].artist.name;
				mostListenedSongUrl = mostListenedSong.tracks.track[0].url;
				mostListenedSongImage = mostListenedSong.tracks.track[0].image[2]["#text"];

				firebase.database().ref('song/').set({
				  name: mostListenedSongName,
				  artist: mostListenedSongArtist,
				  url: mostListenedSongUrl,
				  image: mostListenedSongImage
				});

		}
		// Empty song values
		else {
			console.log(`empty song values for ${countryName}`);
			firebase.database().ref('song/').set({
			  name: '',
			  artist: '',
			  url: '',
			  image: ''
			});
			
			if (mostListenedSong.error){console.error(`error: ${mostListenedSong.error}, ${mostListenedSong.message}`);}
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
    
    xmlHttp.onreadystatechange = function() {

        if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
          let ISSCountryLocation = JSON.parse(xmlHttp.responseText);

			if (ISSCountryLocation) {
			  if (ISSCountryLocation.geonames[0]) {
				console.log(ISSCountryLocation);
				let ISScountryCode;
				let ISScountryName;
				let ISStoponymName;
				
				// Check and set country code, country name and toponym name
				if(ISSCountryLocation.geonames[0].countryCode && ISSCountryLocation.geonames[0].countryName && ISSCountryLocation.geonames[0].toponymName) {
					
					ISScountryCode = ISSCountryLocation.geonames[0].countryCode;
					ISScountryName = ISSCountryLocation.geonames[0].countryName;
					ISStoponymName = ISSCountryLocation.geonames[0].toponymName;
					
					console.log(`countryCode: ${ISScountryCode}, countryName: ${ISScountryName}, toponymName: ${ISStoponymName}`);
					
					firebase.database().ref('currentCountry/').set({
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
			  } else { console.log('agua');}
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
            // TODO Mostrar recorrido
            // TODO show a ISS logo in the map
            const googleMapsKey = "AIzaSyApZj382B_afAx4ecNtytJFhvWhTf9WvWw";
            const img_url = `https://maps.googleapis.com/maps/api/staticmap?center=${latlon}&zoom=5&size=400x300&sensor=false&key=${googleMapsKey}`;

            firebase.database().ref('currentPosition/').set({
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
  }, 60000);
  

  // Get crew info from NASA
  setInterval(
  function getCrew() {
    let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
        let crew = JSON.parse(xmlHttp.responseText).people;
        firebase.database().ref('cosmonaut/').set({
          crew
        });
      } else if (xmlHttp.readyState === 4 && xmlHttp.status === 404) {
          console.error("ERROR! 404");
          console.info(JSON.parse(xmlHttp.responseText));
      }
    };
    xmlHttp.open("GET", "http://api.open-notify.org/astros.json", true);
    xmlHttp.send();
}, 86400000);

//(function(){

  // https://blogs.nasa.gov/spacestation/feed/
  // news regarding ISS parse RSS xml

  // from https://www.nasa.gov/mission_pages/station/expeditions/index.html
 // var crewImage = document.querySelector("div#cards div.bg-card-canvas").style.backgroundImage;
 
 // var missionOverview = document.querySelector("div#ember1127 div div p");
  // var currentMission = meta twitter:title;
 // document.getElementById('currentMissionBadge').src = 'https://www.nasa.gov/sites/default/files/styles/1x1_cardfeed/public/thumbnails/image/iss057-s-001b.jpg';


//})();
