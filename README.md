# Taskplaner App
This web app allows you to manage tasks with awareness of deadlines and the possibility of time tracking.

**NOTES:**
- The app is an experimental prototype
- There is no warranty for the use of the demo
- The structure of the project could extensively change in future
- The app was an partial result of an scientific research on who web app technologies were approximating native mobile app since 2012
- In future this app will serve as an experimental platform to prove new web technologies coming (excitedly waiting for periodic background sync to come)

##Features
- Works 100% offline
- Usable as standalone app on your mobile devices
- Manage tasks (create, edit, delete)
- Search for tasks in list
- Deadline warning signals
- .. more features planned

##Developer information
**HTTPS** is needed:
During development you'll be able to use service worker through localhost, but to deploy it on a site you'll need to have HTTPS setup on your server.

**Google Cloud Messaging / Firebase Cloud Messaging** is needed:
- To be able to use the push notification possibility in Chrome, you will need to register for google's push service.
- The project id of your google api project musst be placed in the web app manifest.json file in "gcm_sender_id" field

**Server application** is needed:
- For now you will need an server application who manages the device registrations for push service and who will trigger the push messages over push service to the registered devices
- Within the app.js file you will need to add address to your application server, so the web app can communicate its push service registration to it

##Changelog
Experimental for lifetime