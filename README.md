# Spotify Collaborative Playlist Maker

In week 1 of this school project I made as seperate project (safe space chat). [Click here](https://github.com/meessour/safe-space-chat) to view this repo/project.

With this collaborative playlist maker you can work together with friends to create a playlist together. Once someone makes a request to add a certain track to the playlist, a vote for that track is made. People are able to accept or decline the addition of the track in the playlist. If the majority said yes, then the track is added. This app makes use of Spotify's services like their API.

## Demo's

[Live Demo](https://collaborative-playlist-maker.herokuapp.com/)

## Table of Contents
1. [How to install](#How-to-install)
2. [Data lifecycle](#data-lifecycle)

    2.1 [Events](#events)
    
    2.2 [Data Examples](#data-examples)
3. [API](#api)

    3.1 [App's usage of Spotify's API](#apps-usage-of-spotifys-api)
4. [.env file](#env-file)
5. [Endpoints](#endpoints)
6. [Worth mentioning](#worth-mentioning)
7. [Dependencies](#dependencies)
8. [Wishlist](#wishlist)
9. [License](#License)

## How to install
**Step 1:** Clone project:
```git
git clone https://github.com/meessour/real-time-web-1920.git
```

**Step 2:** CD to path of the project's root:
```git
cd C:/../..
```

**Step 3:** Install packages:
```git
npm install
```

**Step 4:** Start the server:
```git
npm start
```

**Step 5:** Navigate to the `localhost:1337` in your browser

## Data Lifecycle
![Image](docs/img/final-app-readme/dataflow.png)

### Events

* `'set username'`: Sends a trimmed string to the server
    * `'set username' (response)`: On success, the server response with the username, this is subsequently concatenated to the active users in the group.
* `'create room'`: Request to the server to make a new group.
    * `'create room' (response)`: The user creates a group object, with the group's creator as only user and no tracks and pushes this to the main datamodel. On success the server response with the group's pin. 
* `'join room'`: Request to the server to join a group. Uses the input for the pin as parameter. On fail
    * `'join room' (response)`: Returns the room pin and the group's playlist on success. It returns nothing on wrong pin or failiure. Client handles the creation of playlist's HTML. Client sets pin as current group pin.
* `'search track'`: Sends the input of the user to the server.
    * `'search track' (response)`: Response with the 5 best matches of the search input. returned an array with parsed tracks containing only necessary data.
* `'add track request'`: Sends an ID of the specified track to the server
* `'update playlist'` Is called when a new track is added/requested for addition. It emits the whole playlist in the form of all tracks. It is broadcasted to everyone in a particular group identified by pin everytime it changes. This way everyone in the group always share the exact same data.
* `disconnecting`: When the user is disconnecting the server handles this by kicking the user from the group.

### Data examples
The largest dataset on the server can be seen down here. In the server smaller data objects are 'living' like the users and tracks, these are also found in this data model. Down here is an example of how a dataset may look for such a group.

```json
"group": {
  pin: '65423',
  users: [{
      id: 'BybLw-21zGw1oupMAAAB',
      userName: 'Naampje' 
  }, {
      id: 'Hsdkjn8-34978eijSDFj3',
      userName: 'NogEenNaampje' 
  }],
  tracks: [{
      state: 'pending',
      votedYes: ['21zGw1oupMAAAB'],
      votedNo: [],
      track: {
          id: '5yY9lUy8nbvjM1Uyo1Uqoc',
          name: 'Life Is Good (feat. Drake)',
          album: 'https://i.scdn.co/image/ab67616d000048518a01c7b77a34378a62f46402',
          duration: '1830000'
      }
  },{
      state: 'accepted',
      votedYes: ['BybLw-21zGw1oupMAAAB', 'Hsdkjn8-34978eijSDFj3'],
      votedNo: [],
      track: {
          id: '5dfkgjnDUy8nbvjM1sdf4',
          name: 'Lucid Dreams',
          album: 'https://i.scdn.co/image/ab67616d00004851f7db43292a6a99b21b51d5b4',
          duration: '2140000'
      }
   }],
}]
```

## API
This apps uses the Spotify web api [Spotify Web API](https://developer.spotify.com/documentation/web-api/). There are 3 different kinds of authorization flows; Refreshable user authorization, Temporary user authorization and Refreshable app authorization. For the first two the user needs to log in to their Spotify account and grant permission. The third one, which this apps uses, let's the developer make use of Spotify's public API. This flow 

The app needs to be registered on the spotify developers site in order to make use of Spotify's resources. Once registered a client id and client secret is given which is used in the app's server to generate an access token. This access token is (as of writing this) usable for 1 hour, after that a new token needs to be generated.

In order to obtain resources, the generated token needs to be placed in the call's header like this: `Authorization: Basic <access-token>`. The service returns the requested data via an object.

The Spotify API has excellent documentaion and has no rate limits (with exceptions like making a lot of calls in a really short period of time). Almost every piece of data is at the deveoloper's finger tips which Spotify itself uses too. 

### App's usage of Spotify's API
This app makes use of Spotify's search engine, specifically searching for tracks. Here is how to app handles a search request from the user:

Everytime an input event is made on the search input, and the value is not empty, the client emits the input to the server via sockets:

```javascript
socket.emit('search track', input)
```

the first thing the server does is get a token before a call to Spotify's services can be made. This is done using:
```javascript
Token.getToken()
```

First the server checks if the previously used access token is still valid with the `checkToken()` function:
```javascript
checkToken() {
    const currentTimeInSeconds = Date.now() / 1000;

    // Checks if the token is still valid
    return this.token &&
        this.timeOfExpiration &&
        currentTimeInSeconds < this.timeOfExpiration;
}
```
This function returns true if the current time is SMALLER than the time of expiration. If that is the case the current token is returned `return this.token;`. If this value is LARGER then it means it has been 1 hour since the access-token was generated. If this is the case, a new access-token will be generated. This is how a token is fetched:

```javascript
async fetchToken() {
    const id = process.env.CLIENT_ID;
    const secret = process.env.CLIENT_SECRET;

    const url = 'https://accounts.spotify.com/api/token';

    try {
        const encryptedToken = Buffer.from(`${id}:${secret}`).toString('base64');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${encryptedToken}`
            },
            body: 'grant_type=client_credentials'
        });

        return response.json();
    } catch (error) {
        console.log("Something went wrong", error)
    }
}
```

It encrypts the client_id and client_secrety using base-64 and is placed in on of the headers. This call return an access-token and the expiration time. After that, the access-token and time of expiration are stored in the class.

```javascript
const currentTimeInSeconds = Date.now() / 1000;

const timeOfExpiration = (currentTimeInSeconds + expiresIn);

this.token = token;
this.timeOfExpiration = timeOfExpiration;
```

Once the token is fetched, the function `Tracks.searchTracks(token, input)` is called with the user's input and the access-token. From there a fetch URL is created like this:
```javascript
 // Encode special charcter with "percent encoding"
 input = escape(input)

 const requestType = "GET";

 // Search for tracks
 const searchType = "track";

 // Only load the 5 most popular tracks
 const itemsToLoad = 5;

 const finalUrl = `${baseUrl}search?q=${input}&type=${searchType}&limit=${itemsToLoad}`;
```
`input = escape(input)` is used to encode special characters (if the input has those). In order for a URL to be valid it may not include characters like: `'` or `/`.

Then the call is made with the content type and token placed in the headers. On success it returns an object with the tracks of the search result:

```javascript
const response = await fetch(finalUrl, {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
});
```

After a successful response, the tracks are parsed with `Tracks.parseTracks(tracks);` (to get rid of unnecessary data) and returned to the client. The client generates the HTML and puts it in the 'results container'.

```javascript
// Generate the HTML used to show the list
const trackListHtml = generateTrackListHtml(response);

changeInnerHTML(document.getElementById("tracks-container"), trackListHtml);
```

## .env file
```javascript
CLIENT_ID = <clientId>
CLIENT_SECRET = <clientSecret>
MONGO_USERNAME = <mongoUsername>
MONGO_PASSWORD = <encodedPassword>
MONGO_URL = <mongoUrl>
```

## Endpoints
* 'https://accounts.spotify.com/api/token'
* 'https://api.spotify.com/v1'
    * '/search?q=<input>&type=track&limit=5'
    * '/tracks/<trackId>'

## Worth mentioning
Spotify returns loads of information about a track. Because new tracks are loaded everytime the user changes the input, a lot of communication between client-server-api is present. That's why the track's data is minified to only the id, title, albumcover and duration.

The Token class makes sure to reuse an access-token if it is still valid. This way less calls are made to the spotify API.

When the server starts, a connection is made to the mongo database. Then a global variable is set that points to the groups datamodel. This way it is very easy to read and understandable, like inserting a new entry: 
```javascript
mongoDBClient.insertOne(object, function(err, res) {
   if (err) throw err;

   console.log("1 document inserted");
});
```

When the user suddenly loses connection or leaves, the server handles this correctly when this occures. By using `'disconnecting'` the socket's information (id, username) are still available. With this information the user is removed from the group it was in and updates the userlist for all other group members (the function `leaveGroup` handles this).
```javascript
socket.on('disconnecting', function () {
// Let the user leave every group he/she was in
Object.keys(socket.rooms).forEach(groupPin => leaveGroup(groupPin, socketId))
}
```

As soon as the user connects, he/she are kicked out of the default room (default room is names after their ID). This way the server can make sure the user is only in zero or one group at a time. 

```javascript
socketIo.on('connection', (socket) => {
    socket.leaveAll();
});
```

When the user clicks one of the songs from the search result list, the client needs to know what song was clicked. In order to identify the clicked song, the id is the track is set as the element's id. Everytime a new search result is shown, a onclick listener is set for every track-item using this function:
```javascript
function setTrackItemsListeners() {
    // Sets an event listener for every track item in the search result container
    document.getElementById("tracks-container").querySelectorAll(".track-item").forEach(function (element) {
        element.addEventListener("click", function () {
            // Check if the element has an id
            if (element && element.id) {
                requestTrackAdd(element.id)
            }
        });
    });
}
```

`setTrackItemsListeners()` iterates over all items in the search-container and adds a `addEventListener` to every item. After a click the `requestTrackAdd` function is called with the element's id. This is what a track-item element's root looks like:

```html
<a id="3Dv1eDb0MEgF93GpLXlucZ" class="track-item"></a>
```

In order to communbicate with the Spotiofy services, the app uses the `node-fetch` package. Here is an example of a call made using `node-fetch`:

```javascript
const response = await fetch(finalUrl, {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
});
```

Once the reponse is returned it is parsed into a JSON object using: 

```javascript
const responseJson = response.json()
```

## Dependencies
* body-parser
* dotenv
* ejs
* express
* node-fetch
* socket.io

## Wishlist
- [ ] Being able to vote yes/no on a track
- [ ] Being able to delete tracks.
- [ ] Remember users (using username and password. or the UUID node package)
- [ ] Saving room/group/playlist on a database
- [ ] Being able to save playlist on Spotify
- [ ] Being able to listen to the song via the app

## License
This repository is licensed as [MIT](LICENSE) @ [Mees Sour](https://github.com/meessour).
