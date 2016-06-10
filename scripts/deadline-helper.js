/**
 * Created by Simon on 01.03.16.
 */
var DeadlineHelper = {
    taskDatabase: null,
    init: function(){
        var me = this;
        return new Promise(function(resolve, reject){
            let dbRequest = indexedDB.open("TaskDatabase");

            dbRequest.onerror = function(event) {
                reject('Error Worker: Failed open IndexedDB');
            };
            dbRequest.onsuccess = function(event) {
                me.taskDatabase = dbRequest.result;

                me.taskDatabase.onerror = function(event) {
                    console.log('Error Worker: Failed transact on IndexedDB')
                };

                resolve();
            };

            dbRequest.onupgradeneeded = function(event) {
                let db = event.target.result;
            };
        })
    },
    processTimeToDeadline: function(tasks){
        var me = this,
            timeNow = new Date(),
            deadlineAlerts = 0;

        for(let key in tasks){
            if (tasks[key].deadlineDay != undefined) {
                let deadline = new Date(
                    tasks[key].deadlineYear,
                    tasks[key].deadlineMonth - 1,
                    tasks[key].deadlineDay,
                    tasks[key].deadlineHour,
                    tasks[key].deadlineMinutes,
                    0,
                    0);

                tasks[key].timeLeft = Math.floor((deadline - timeNow) / 1000 / 60 / 60);
            } else {
                tasks[key].timeLeft = -100; // a number value is always needed, otherwise IDBObjectStore index sort by timeLeft is ignoring this entry
            }

            if(tasks[key].timeLeft < 2 && tasks[key].timeLeft != -100)
                ++deadlineAlerts;
        }

        // save updated tasks to db if possible
        var objectStore = me.taskDatabase.transaction("task", "readwrite").objectStore("task");

        for(let key in tasks){
            let putRequest = objectStore.put(tasks[key]);

            putRequest.onerror = function() {
                console.log('Error Worker: Failed update IndexedDB')
            };
        }

        return {
            success: true,
            tasks: tasks,
            hasDeadlineAlerts: deadlineAlerts != 0};
    },
    readTasksFromDb: function(){
        var me = this;
        return new Promise(function(resolve, reject){
            let objectStore = me.taskDatabase.transaction("task").objectStore("task");
            let cursorResult = objectStore.index('timeLeft').openCursor(null, "prev");
            var tasks = [];
            cursorResult.onsuccess = function(event) {
                let cursor = event.target.result;
                if (cursor) {
                    tasks.push(cursor.value);
                    cursor.continue();
                }
                else {
                    resolve(tasks);
                }
            };
            cursorResult.onerror = function(event){
                reject("Error Read Tasks");
            }
        })
    }
};