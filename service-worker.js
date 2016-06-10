importScripts("/scripts/deadline-helper.js");

var dataCacheName = 'taskData-v20';
var cacheName = 'dailyBurndown';
var filesToCache = [
    '/',
    '/index.html',
    '/scripts/app.js',
    '/scripts/time-worker.js',
    '/scripts/deadline-helper.js',
    '/styles/inline.css',
    '/images/ic_add_white_24px.svg',
    '/images/ic_refresh_white_24px.svg',
    '/images/ic_menu_24px.svg',
    '/images/ic_info_outline_24px.svg',
    '/images/ic_details_black_24px.svg',
    '/images/ic_note_add_black_24px.svg',
    '/images/ic_mode_edit_black_24px.svg',
    '/images/ic_delete_forever_black_24px.svg',
    '/images/ic_timer_black_24px.svg',
    '/images/ic_search_white_24px.svg',
    '/images/ic_back_24px.svg',
    '/images/icons/ic_assignment_black_48dp-128x128.png',
    '/images/icons/ic_assignment_black_48dp-144x144.png',
    '/images/icons/ic_assignment_black_48dp-152x152.png',
    '/images/icons/ic_assignment_black_48dp-192x192.png',
    '/images/icons/ic_assignment_black_48dp-256x256.png'
];

self.addEventListener('install', function(e) {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            console.log('[ServiceWorker] Caching App Shell');
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function(e) {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {
                console.log('[ServiceWorker] Removing old cache', key);
                if (key !== cacheName) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(response) {
            if(response)
                console.log('[ServiceWorker] From Cache', e.request.url);
            else
                console.log('[ServiceWorker] Fetch', e.request.url);
            return response || fetch(e.request);
        })
    );
});

self.addEventListener('push', function(e){
    // handling server push messages
    if(e.data == null) {
        e.waitUntil(
            self.deadlineChecking().then(function(result) {
                console.log(result);
                if (result.hasDeadlineAlerts) {
                    self.registration.showNotification("Task Planer:", {
                        body: "Deadlines stehen an!",
                        icon: null,
                        tag: 'deadline-checker'
                    })
                }
            }, function(error) {
                console.error("Failed!", error);
            })
        );
    }
});

// handle clicks on notification
self.addEventListener('notificationclick', function(event) {
    console.log('On notification click: ', event.notification.tag);
    // Some devices do not close notification on click
    // Example see: http://crbug.com/463146
    event.notification.close();

    // Set focus on already opened app window or open a new one
    event.waitUntil(
        clients.matchAll({
            type: "window"
        })
            .then(function(clientList) {
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url == '/' && 'focus' in client)
                        return client.focus();
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

self.deadlineChecking = function(){
    var me = this;

    console.log("calculateDeadlines");
    return new Promise(function(resolve, reject){
        DeadlineHelper.init()
            .then(function(){
                return DeadlineHelper.readTasksFromDb();
            })
            .then(function(tasks){
                resolve(DeadlineHelper.processTimeToDeadline(tasks));
            },function(error){
                reject(error);
            });
    })
};
