/* --- firebase imports --- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import { getDatabase, ref, set, push, remove, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider  } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js";

/* --- firebase configurations --- */

const firebaseConfig = {
    apiKey: "AIzaSyD57La3cqDsJGQmSEDrYGjOGQrzZBz-CwI",
    authDomain: "la-passerelle-bebca.firebaseapp.com",
    databaseURL: "https://la-passerelle-bebca-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "la-passerelle-bebca",
    storageBucket: "la-passerelle-bebca.appspot.com",
    messagingSenderId: "570866169743",
    appId: "1:570866169743:web:8fba8f81ec1a9fc1743dfa"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const firebaseMessageDirectory = ref(db, "messages/");

/* --- authentication --- */

const provider = new GoogleAuthProvider();
const auth = getAuth();
let userName = '';
let userID = '';
let userPhotoUrl = '';

/* --- VARIABLES --- */

const userSection = document.querySelector('.userProfile');
const chatSection = document.querySelector('.chatbox');
const gifsSection = document.querySelector('.gifs');

const input = document.querySelector('input.chatMessage');
const messageForm = document.querySelector('.messageForm');
const messagesSection = document.querySelector('.messages');

const inputGif = document.querySelector('input.gif-search');
const gifResults = document.querySelector('.gif-results');
const gifPreview = document.querySelector('.gif-preview');

const buttonLogin = document.querySelector('button.login');

/* --- FUNCTIONS  --- */

function connectUser()
{
    signInWithPopup(auth, provider)
        .then(function(result)
        {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;

            // The signed-in user info.
            let user = result.user;
            userName = user.displayName;
            userID = user.uid;
            userPhotoUrl = user.photoURL;

            userLogin();
            launchApp();
        })
        .catch(function(error)
        {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            // ...
        });
}

function userLogin()
{
    userSection.innerHTML = '<span>' + userName + '</span>' + '<img src="' + userPhotoUrl + '">';
    userSection.classList.add('isLoggedin');
    chatSection.style.display = 'block';
    gifsSection.style.display = 'block';
}

function saveMessage()
{
    const timestamp = Date.now();
    push(firebaseMessageDirectory, {
        'user': userName,
        'img': ((gifPreview.src != 'http://127.0.0.1:5500/') ? gifPreview.src : ''),
        'content': input.value,
        'date': timestamp,
        'user_id': userID,
        'userPhoto': userPhotoUrl
    });

    input.value = '';
    gifPreview.src = '';
}

function submitForm(event)
{
    event.preventDefault();
    saveMessage();
}

function searchGif()
{
    if(this.value == '')
    {
        gifResults.innerHTML = '';
        return;
    }

    fetch('http://api.giphy.com/v1/gifs/search?api_key=oEiRlWuE4fEbgVjKspk0pXv74XvATZAK&limit=5&q=' + this.value)
        .then(function(response)
        {
            return response.json()
        })
        .then(function(json)
        {
            gifResults.innerHTML = '';

            if(json.data.length == 0)
            {
                throw('No result :/');
            }
            
            for(let gif of json.data)
            {
                let img = document.createElement('img');
                img.src = gif.images.fixed_height.url;
                img.title = gif.title;

                gifResults.append(img);

                img.addEventListener('click', sendGif);
            }
        })
        .catch(function(message)
        {
            gifResults.innerHTML = message;
        });
}

function sendGif()
{
    gifPreview.src = this.src;
}

/* --- EVENT LISTENERS --- */

messageForm.addEventListener('submit', submitForm);
inputGif.addEventListener('keyup', searchGif);
buttonLogin.addEventListener('click', connectUser);

/* --- firebase listeners --- */

function launchApp()
{
    onChildAdded(firebaseMessageDirectory, function(data) // "onValue()" lit les données sans récupérer les nouvelles
    {
        let date = new Date(parseInt(data.val().date));

        let article = document.createElement('article');
        article.id = data.key;

        // body
        let contentBody = document.createElement('div');
        contentBody.innerHTML = '<strong>' + data.val().user + '</strong>'
            + '<p>' + data.val().content + '</p>';
        article.appendChild(contentBody);

        // edit input
        let editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.setAttribute('value', data.val().content);
        editInput.style.display = 'none';
        editInput.addEventListener('change', function(event)
        {
            event.preventDefault();

            const timestamp = Date.now();
            set(ref(db, "messages/" + data.key),
            {
                'user': data.val().user,
                'img': data.val().img,
                'content': this.value,
                'date': data.val().date,
                'user_id': userID,
                'userPhoto': userPhotoUrl
            });

            this.style.display = 'none';
            this.parentNode.querySelector('p').style.display = 'block';
        });
        article.appendChild(editInput);

        // attachment
        let contentAttachment = document.createElement('div');
        contentAttachment.innerHTML = ((data.val().img)
            ? '<div><img src="' + data.val().img + '"></div>'
            : '');
        article.appendChild(contentAttachment);

        // edit icon
        let editIcon = document.createElement('a');
        editIcon.href = '#';
        editIcon.classList.add('action-link');
        editIcon.innerHTML = 'edit';
        editIcon.addEventListener('click', function(event)
        {
            event.preventDefault();

            // hide all article inputs
            let articleInputAll = document.querySelectorAll('article input');
            for(let input of articleInputAll)
            {
                input.style.display = 'none';
            }

            // show all articl paragraphs
            let articleParagraphAll = document.querySelectorAll('article p');
            for(let paragraph of articleParagraphAll)
            {
                paragraph.style.display = 'block';
            }

            let contentMessage = this.parentNode.querySelector('p');

            if(editInput.style.display == 'none')
            {
                editInput.style.display = 'block';
                editInput.select();
                contentMessage.style.display = 'none';
            }
            else
            {
                editInput.style.display = 'none';
                contentMessage.style.display = 'block';
            }
        });
        article.appendChild(editIcon);

        // remove icon
        let removeIcon = document.createElement('a');
        removeIcon.href = '#';
        removeIcon.classList.add('action-link');
        removeIcon.id = data.key;
        removeIcon.innerText = 'remove';
        removeIcon.addEventListener('click', function(event)
        {
            event.preventDefault();
            remove(ref(db, "messages/" + this.id));
        });
        article.appendChild(removeIcon);

        // wrapper
        let wrapper = document.createElement('div');
        wrapper.dataset.articleId = data.key;
        wrapper.classList.add('message-wrapper');
        wrapper.appendChild(article);
        
        // check if current user
        if(data.val().user_id == userID)
        {
            wrapper.classList.add('currentUser');
        }

        // user photo
        let userImg = document.createElement('img');
        userImg.classList.add('userPhoto');
        userImg.src = data.val().userPhoto;
        wrapper.appendChild(userImg);

        // date
        let dateElement = document.createElement('small');
        dateElement.classList.add('messageDate');
        dateElement.innerHTML = ((date.getHours() < 10) ? '0' : '') + date.getHours()
            + ':' + ((date.getMinutes() < 10) ? '0' : '') + date.getMinutes()
            + ':' + ((date.getSeconds() < 10) ? '0' : '') + date.getSeconds();
        wrapper.appendChild(dateElement);

        let existingWrapper = '';
        if(existingWrapper = document.querySelector('.message-wrapper[data-article-id="' + data.key + '"]'))
        {
            console.log('2');
            existingWrapper.after(wrapper);
            existingWrapper.remove();
        }
        else
        {
            console.log('1');
            messagesSection.appendChild(wrapper);
        }
    });

    onChildChanged(firebaseMessageDirectory, function(data)
    {
        let paragraph = document.querySelector('.chatbox article#' + data.key + ' p');
        paragraph.innerHTML = data.val().content;
    });

    onChildRemoved(firebaseMessageDirectory, function(data)
    {
        let article = document.querySelector('.message-wrapper[data-article-id="' + data.key + '"]');
        article.innerHTML = '';
    });
}