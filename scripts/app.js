(function() {
    'use strict';

    var app = {
        isLoading: true,
        hasRequestPending: false,
        visibleTasks: {},
        selectedCities: [],
        spinner: document.querySelector('.loader'),
        taskTemplate: document.querySelector('.taskTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container'),
        sideNavToggleButton: document.querySelector('.js-toggle-menu'),
        sideNav: document.querySelector('.js-side-nav'),
        sideNavContent: document.querySelector('.js-side-nav-content'),
        apiRoute: "PLACE THE ADDRESS TO YOUR APPLICATION SERVER MANAGING THE REGISTRATION IN HERE",
        prioList: [1,2,3],
        stateList: ["offen", "in Arbeit", "Erfolgreich erledigt", "Erfolglos erledigt", "wartend"]
    };


    /*****************************************************************************
    *
    * Event listeners for UI elements an UI init
    *
    ****************************************************************************/

    document.getElementById('butRefresh').addEventListener('click', function() {
        // Refresh all of the tasks
        app.taskManager.updateTasks().then(function() {
            console.log("Tasks updated background");
            // Tasks updated succesfully in all background points
            // Re-Render
            Promise.resolve({
                then: function(onFulfill, onReject){
                    app.taskManager.tasks.forEach(function(task) {
                        app.updateTaskViewElement(task);
                    });
                    onFulfill();
                }
            }).then(function(){
                app.notificationService.toastHandler.createToastNotification("Aktualisierung fertig!")
            }, function(error){

            })
        }, function(error) {
            app.notificationService.toastHandler.createToastNotification("Fehler Aktualisierung");
            console.error("Failed updating Tasks!", error);
        });
    });

    var prioSelect = document.getElementById('prioSelect');
    app.prioList.forEach(function(prio, index){
        let option = document.createElement('option');
        option.value = index;
        option.textContent = prio;
        prioSelect.appendChild(option);
    });
    var stateSelect = document.getElementById('stateSelect');
    app.stateList.forEach(function(state, index){
        let option = document.createElement('option');
        option.value = index;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
    document.getElementById('butAdd').addEventListener('click', function() {
        // Open the add/edit task dialog
        app.addDialog.querySelector('#butAddTask').textContent = 'Add';
        app.addDialog.querySelector('.dialog-title').textContent = 'Neue Task anlegen';
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddTask').addEventListener('click', function() {
        // save the inserted information to task or create new task
        var taskForm = document.getElementById('task-form'),
            taskData = new FormData(taskForm);

        var pseudoTask = {};
        for (var $key of taskData.keys()) {
            if($key == "deadlineDate"){
                var date = taskData.get($key).split("-");
                pseudoTask.deadlineDay = date[2];
                pseudoTask.deadlineMonth = date[1];
                pseudoTask.deadlineYear = date[0];
            }else if($key == "deadlineTime"){
                var time = taskData.get($key).split(":");
                pseudoTask.deadlineHour = time[0];
                pseudoTask.deadlineMinutes = time[1];
            }else{
                pseudoTask[$key] = taskData.get($key);
            }
        }
        if (pseudoTask.id == '') {
            app.taskManager.addNewTask(taskData.get('name'), pseudoTask);
        } else {
            app.taskManager.editTask(new Task(pseudoTask.id, pseudoTask.name, pseudoTask), true);
        }

        taskForm.reset();
        app.addDialog.querySelector('input[name$="id"]').value = '';
        app.toggleAddDialog(false);
    });

    document.getElementById('butAddCancel').addEventListener('click', function() {
        // Close add/edit task dialog
        app.addDialog.querySelector('#task-form').reset();
        app.toggleAddDialog(false);
    });

    /** Sidenav **/
    app.sideNavToggleButton.addEventListener('click', function(){
        app.toggleSideNav();
    });

    app.sideNav.addEventListener('click', function(){
        app.closeSideNav();
    });
    app.sideNavContent.addEventListener('click', function(e){
        e.stopPropagation();
    });

    var touchStartX;
    var sideNavTransform;
    app.sideNavContent.addEventListener('touchstart', function(e){
        touchStartX = e.touches[0].pageX;
    });
    app.sideNavContent.addEventListener('touchmove', function(e){
        var newTouchX = e.touches[0].pageX;
        sideNavTransform = Math.min(0, newTouchX - touchStartX);

        if (sideNavTransform < 0)
            e.preventDefault();

        app.sideNavContent.style.transform =
            'translateX(' + sideNavTransform + 'px)';
    });
    app.sideNavContent.addEventListener('touchend', function(e) {
        if (sideNavTransform < -1)
            app.closeSideNav();
    });

    /** Search header bar **/
    var searchHeader = document.querySelector('.header-search');
    var searchInput = searchHeader.querySelector('.searchfield');
    document.querySelector('#butSearch').addEventListener('click', function() {
        searchInput.value = '';
        searchHeader.classList.add('active');
        searchInput.focus();
    });
    searchHeader.querySelector('#butBackSearch').addEventListener('click', function() {
        searchHeader.classList.remove('active');
        app.pubSubBroker.publish('taskplaner/onSearchInput',['']);
    });
    searchInput.addEventListener('input', function(){
        let searchTerm = this.value.trim();
        app.pubSubBroker.publish('taskplaner/onSearchInput',[searchTerm]);
    });

    /*****************************************************************************
    *
    * Methods to update/refresh/move the UI
    *
    ****************************************************************************/

    app.toggleSideNav = function(){
        if (app.sideNav.classList.contains('side-nav--visible'))
            app.closeSideNav();
        else
            app.openSideNav();
    };

    app.openSideNav = function() {

            app.sideNav.classList.add('side-nav--visible');
            app.sideNavToggleButton.focus();

            var onSideNavTransitionEnd = function(e) {
                // Force the focus, otherwise touch doesn't always work.
                app.sideNavContent.tabIndex = 0;
                app.sideNavContent.focus();
                app.sideNavContent.removeAttribute('tabIndex');

                app.sideNavContent.classList.remove('side-nav--content--animatable');
                app.sideNavContent.removeEventListener('transitionend', onSideNavTransitionEnd);
            };

            app.sideNavContent.classList.add('side-nav--content--animatable');
            app.sideNavContent.addEventListener('transitionend', onSideNavTransitionEnd);

            requestAnimationFrame( function(){
                app.sideNavContent.style.transform = 'translateX(0px)';
            });
    };

    app.closeSideNav = function() {
        app.sideNav.classList.remove('side-nav--visible');
        app.sideNavContent.classList.add('side-nav--content--animatable');
        app.sideNavContent.style.transform = 'translateX(-102%)';

        var onSideNavClose = function() {
            app.sideNav.removeEventListener('transitionend', onSideNavClose);
        };
        app.sideNav.addEventListener('transitionend', onSideNavClose);
    };

    // Toggles the visibility of the add new city dialog.
    app.toggleAddDialog = function(visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    app.openEditTaskDialog = function(task){
        // fill task
        app.addDialog.querySelector('input[name$="id"]').value = task.id;
        app.addDialog.querySelector('input[name$="name"]').value = task.name;
        app.addDialog.querySelector('input[name$="contentType"]').value = task.contentType;
        app.addDialog.querySelector('#stateSelect').value = task.state;
        app.addDialog.querySelector('#prioSelect').value = task.prio;
        app.addDialog.querySelector('input[name$="timeMust"]').value = task.timeMust;
        app.addDialog.querySelector('textarea[name$="description"]').value = task.description;
        app.addDialog.querySelector('input[name$="deadlineDate"]').value =
            task.deadlineYear+"-"+task.deadlineMonth+"-"+task.deadlineDay;
        app.addDialog.querySelector('input[name$="deadlineTime"]').value =
            task.deadlineHour+":"+task.deadlineMinutes;

        // show task dialog
        app.addDialog.querySelector('#butAddTask').textContent = 'Edit';
        app.addDialog.querySelector('.dialog-title').textContent = 'Task editieren';
        app.toggleAddDialog(true);
    };

    app.removeTaskViewElement = function(taskId){
        if(app.visibleTasks[taskId] != undefined
            && app.container.removeChild(app.visibleTasks[taskId]) != null){
            app.visibleTasks[taskId] = undefined;
            delete app.visibleTasks[taskId];
        }
    };

    // Updates task with the given new data. If task doesn't exists a new one is created an saved
    app.updateTaskViewElement = function(data, prepend) {
        let task = app.visibleTasks[data.id];
        var firstTime = false;
        if (!task) {
            firstTime = true;
            task = app.taskTemplate.cloneNode(true);
            task.classList.remove('taskTemplate');
            task.querySelector('.task-id').textContent = data.id;
            task.removeAttribute('hidden');
            if (prepend)
                app.container.appendChild(task);
            else
                app.container.insertBefore(task, app.container.firstChild);
            app.visibleTasks[data.id] = task;
        }
        task.querySelector('.name').textContent = data.name;
        if (!isNaN(data.timeLeft) && data.timeLeft != -100) {
            task.querySelector('.name').setAttribute('data-after', ' - noch ' + data.timeLeft + 'h');
        }else{
            task.querySelector('.name').setAttribute('data-after', '');
        }
        if (data.deadlineDay != undefined) {
            task.querySelector('.meta .basic .deadline').textContent = data.deadlineDay + "." + data.deadlineMonth + "." + data.deadlineYear;
        }else{
            task.querySelector('.meta .basic .deadline').textContent = "-"
        }
        task.querySelector('.meta .basic .tags').textContent = data.contentType;
        task.querySelector('.meta .optional .prio').textContent = app.prioList[data.prio];
        task.querySelector('.meta .optional .created').textContent =  data.createDateVisible;
        task.querySelector('.meta .basic .status').textContent = app.stateList[data.state];
        task.querySelector('.meta .optional .time-planed').textContent = data.timeMust + 'h';
        task.querySelector('.meta .optional .time-tracked').textContent = data.timeHas + 'h';

        // set up escalate color
        // Aufgaben werden im Verhältnis zu Alter, Prio und Deadline in unterschiedlichen Farben dargestellt
        task.querySelector('.escalate').classList.remove("danger", "warning", "info", "success", "primary", "default");
        if(data.state != 2){
            if(data.timeLeft < 0 && data.deadlineDay != undefined && data.timeLeft != -100)
                task.querySelector('.escalate').classList.add("danger");
            else if(data.timeLeft < 2 && data.deadlineDay != undefined && data.timeLeft != -100)
                task.querySelector('.escalate').classList.add("warning");
            else if(data.timeLeft > 2 && data.prio > 0 && data.deadlineDay != undefined)
                task.querySelector('.escalate').classList.add("info");
            else if(data.timeLeft > 2 && data.prio == 0 && data.deadlineDay != undefined)
                task.querySelector('.escalate').classList.add("primary");
            else if(data.deadlineDay == undefined)
                task.querySelector('.escalate').classList.add("default");
        }else if(data.state == 2) {
            task.querySelector('.escalate').classList.add("success");
        }

        if (firstTime) { // set up task actions
            let taskButtons = task.querySelectorAll('.taskButton');

            for (let i = 0; i < taskButtons.length; i++) {
                taskButtons[i].setAttribute('data-id', data.id);
                if (taskButtons[i].classList.contains('butEdit')) {
                    taskButtons[i].addEventListener('click', function () {
                        let task = app.taskManager.getTask(this.dataset.id);
                        app.openEditTaskDialog(task);
                    });
                } else if (taskButtons[i].classList.contains('butDelete')) {
                    taskButtons[i].addEventListener('click', function () {
                        app.taskManager.removeTask(this.dataset.id);
                    });
                } else if (taskButtons[i].classList.contains('butDetail')) {
                    // todo
                } else if (taskButtons[i].classList.contains('butAddNotice')) {
                    // todo
                } else if (taskButtons[i].classList.contains('butTimer')) {
                    // todo startTimer
                    taskButtons[i].addEventListener('click', function () {
                        app.taskManager.toggleTimer(this.dataset.id);
                    });
                }
            }
        }
    };

    app.updateTaskTimerElemenent = function(taskId, timerStep){
        let task = app.visibleTasks[taskId];
        if (task) {
            task.querySelector('.timer').textContent = timerStep;
        }
    };

    app.toggleSpinner = function(){
        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }else{
            app.container.setAttribute('hidden', true);
            app.spinner.removeAttribute('hidden');
            app.isLoading = true;
        }
    };

    /**************************************************
     *  APP LOGIC
     **************************************************/

    // an internal publish subscriber broker
    app.pubSubBroker = {
        topics: {},
        subscribe: function (topic, subscriber) {
            var me = this;
            if (me.topics[topic] === undefined)
                me.topics[topic] = [];

            var index = me.topics[topic].push(subscriber) - 1;

            return {
                remove: function () {
                    delete me.topics[topic][index];
                }
            }
        },
        publish: function (topic, message) {
            var me = this;
            if (me.topics[topic] === undefined)
                return;
            me.topics[topic].forEach(function (subscriber) {
                subscriber.apply(me, message != undefined ? message : [])
            });
        }
    };

    app.ajaxService = {
        xhr: null,
        getNewXhrObject: function(){
            try{
                return new XMLHttpRequest(); // Für alle Browser außer IE
            }catch(e){
                console.log(e);
                return new ActiveXObject("Microsoft.XMLHTTP"); // Für IE
            }
        },
        fetch : function(method, url, callback, data){
            var me = this;
            me.xhr = me.getNewXhrObject();
            me.xhr.open(method, url, true);
            me.xhr.onreadystatechange = function(){
                if(me.xhr.readyState == 4){
                    if(callback != undefined && typeof callback == 'function')
                        callback(me.xhr.responseText);
                }
            };
            me.xhr.send(data);
        }
    };

    // component to manage the user tasks while runtime
    app.taskManager = {
        taskDatabase: null,
        tasks: [],
        timeCalculationWorker: null,
        addTaskQueue: [],
        timeWorkers: {},
        init: function(){
            var me = this;

            // Subscribe to search input event
            app.pubSubBroker.subscribe('taskplaner/onSearchInput', function(searchTerm){
                app.toggleSpinner();
                me.search(searchTerm)
                    .then(function(){
                        app.toggleSpinner();
                        app.notificationService.toastHandler.createToastNotification("Tasks gefunden");
                    }, function(error){
                        app.toggleSpinner();
                        app.notificationService.toastHandler.createToastNotification("Fehler Suche");
                        console.error("Failed!", error);
                    });
            });

            // Set up task database
            var dbRequest = window.indexedDB.open("TaskDatabase");
            dbRequest.onerror = function(event) {
                app.notificationService.toastHandler.createToastNotification("Datenbank-Nutzung nicht zugelassen");
            };
            dbRequest.onsuccess = function(event) {
                me.taskDatabase = dbRequest.result;

                me.taskDatabase.onerror = function(event) {
                    console.log("Database error: " + event.target.errorCode);
                    app.notificationService.toastHandler.createToastNotification("Database error");
                };

                // process add task queue
                // needed for cases where database wasn't ready but tasks were added
                me.addTaskQueue.forEach(function(task){
                    this.addTaskToDb(task);
                },me);

                // Read tasks from database , update tasks and render them
                me.readTasksFromDb()
                    .then(function() {
                        console.log("Success! Read from db");
                        return me.updateTasks();
                    })
                    .then(function() {
                        console.log("Tasks updated background");
                        // Tasks updated succesfully in all background points
                        // (Re-)Render
                        return Promise.resolve({
                            then: function(onFulfill, onReject){
                                app.taskManager.tasks.forEach(function(task) {
                                    app.updateTaskViewElement(task);
                                    app.taskManager.toggleTimer(task.id, true);
                                });
                                onFulfill();
                            }
                        })
                    })
                    .then(function(){
                        app.toggleSpinner();
                        app.pubSubBroker.publish('taskplaner/onTaskManagerReady',[]);
                        app.notificationService.toastHandler.createToastNotification("Task aktualisiert und geladen");
                    }, function(error){
                        app.toggleSpinner();
                        app.notificationService.toastHandler.createToastNotification("Fehler Tasks laden");
                        console.error("Failed!", error);
                    });
            };

            dbRequest.onupgradeneeded = function(event) {
                var db = event.target.result;

                // Create task object store
                var objectStore = db.createObjectStore("task", { keyPath: "id" });
                objectStore.createIndex("name", "name", { unique: false });
                objectStore.createIndex("deadlineMinutes", "deadlineMinutes", { unique: false });
                objectStore.createIndex("deadlineHour", "deadlineHour", { unique: false });
                objectStore.createIndex("deadlineDay", "deadlineDay", { unique: false });
                objectStore.createIndex("deadlineMonth", "deadlineMonth", { unique: false });
                objectStore.createIndex("deadlineYear", "deadlineYear", { unique: false });
                objectStore.createIndex("state", "state", { unique: false });
                objectStore.createIndex("contentType", "contentType", { unique: false });
                objectStore.createIndex("description", "description", { unique: false });
                objectStore.createIndex("timeMust", "timeMust", { unique: false });
                objectStore.createIndex("timeHas", "timeHas", { unique: false });
                objectStore.createIndex("createDate", "createDate", { unique: false });
                objectStore.createIndex("createDateVisible", "createDateVisible", { unique: false });
                objectStore.createIndex("alerted", "alerted", { unique: false });
                objectStore.createIndex("checkInTime", "checkInTime", { unique: false });
                objectStore.createIndex("checkOutTime", "checkOutTime", { unique: false });
                objectStore.createIndex("summedWorkingTime", "summedWorkingTime", { unique: false });
                objectStore.createIndex("summedPausedTime", "summedPausedTime", { unique: false });
                objectStore.createIndex("prio", "prio", { unique: false });
                objectStore.createIndex("timeLeft", "timeLeft", { unique: false });
                objectStore.createIndex("timerStart", "timerSart", { unique: false });
            };
        },
        addNewTask: function(name, options){
            var me = this,
                id = guid(),
                newTask = new Task(id, name, options);

            // add task to db
            me.tasks.push(newTask);
            // render new task to view
            app.updateTaskViewElement(newTask, true);

            // save new task to db
            me.addTaskToDb(newTask);
        },
        addTaskToDb: function(task){
            var me = this;
            if (me.taskDatabase != null) {
                var transaction = me.taskDatabase.transaction("task", "readwrite");

                // Do something when all the data is added to the database.
                transaction.oncomplete = function (event) {
                    app.notificationService.toastHandler.createToastNotification("Task saved");
                };

                transaction.onerror = function (event) {
                    console.log("Error saving task");
                    app.notificationService.toastHandler.createToastNotification("Error saving Task");
                };

                transaction.objectStore("task").add(task);
            } else {
                me.addTaskQueue.push(task);
            }
        },
        updateTaskInDb: function(task){
            var me = this;
            var objectStore = me.taskDatabase.transaction("task", "readwrite").objectStore("task");

            var putRequest = objectStore.put(task);

            putRequest.onerror = function() {
                console.error('Error: Failed update IndexedDB');
            };
        },
        removeTaskFromDb: function(task){
            var me = this;
            var objectStore = me.taskDatabase.transaction("task", "readwrite").objectStore("task");

            var deleteRequest = objectStore.delete(task.id);

            deleteRequest.onerror = function() {
                console.error('Error: Failed update IndexedDB');
            };
        },
        editTask: function(editedTask, updateView){
            var me = this;
            // update task manager repository
            me.tasks.forEach(function(task, index){
                if(task.id == editedTask.id)
                me.tasks[index] = editedTask;
            });
            // update view
            if (updateView) {
                app.updateTaskViewElement(editedTask);
            }
            // update database
            me.updateTaskInDb(editedTask);
        },
        removeTask: function(taskId){
            var me = this;
            // remove from view
            app.removeTaskViewElement(taskId);
            // delete from task manager repository
            let index = me.tasks.findIndex(function(task){
                return task.id == taskId;
            });
            if(index != -1) {
                let task = me.tasks[index];
                me.hardStopTimer(taskId);
                me.tasks.splice(index, 1);

                // delete from database
                me.removeTaskFromDb(task)
            }
        },
        calculateDeadlines: function(){
            var me = this;

            return new Promise(function(resolve, reject){
                var timeWorker = new Worker("/scripts/time-worker.js");

                timeWorker.addEventListener("message", function(e){
                    if(e.data.success){
                        me.tasks = e.data.tasks;
                        this.terminate();
                        resolve();
                    } else if (e.data.error){
                        reject(e.data);
                    } else {
                        console.log(e.data);
                    }
                },false);

                timeWorker.postMessage({
                    cmd: "getTimeToDeadline",
                    tasks: me.tasks
                });
            })
        },
        readTasksFromDb: function(){
            var me = this;
            return new Promise(function(resolve, reject){
                var objectStore = me.taskDatabase.transaction("task").objectStore("task");
                var cursorResult = objectStore.index('timeLeft').openCursor(null, "prev");
                cursorResult.onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        me.tasks.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        resolve(me.tasks.length);
                    }
                };
                cursorResult.onerror = function(event){
                    reject("Error Read Tasks");
                }
            })
        },
        updateTasks: function() {
            var me = this;
            return Promise.all([me.calculateDeadlines()]);
        },
        toggleTimer: function(taskId, tryRestart){
            var me = this;
            let now = new Date();
            let task = me.getTask(taskId);

            if(tryRestart && task.timerStart == null)
                return;

            if(me.timeWorkers[taskId] != undefined){
                // terminate and delete timer worker
                me.hardStopTimer(taskId);

                // reset task value and count up summedWorkingTime
                let timeTracked = Math.floor( ( ((new Date())-task.timerStart)/ 1000 / 60 / 60 ) * 100 ) / 100;
                task.summedWorkingTime += timeTracked;
                task.timeHas += timeTracked;
                task.timerStart = null;
                me.editTask(task, true);
                app.updateTaskTimerElemenent(taskId, "");
                return;
            }else{
                if (task.timerStart == null) {
                    task.timerStart = now;
                    me.editTask(task);
                }
            }

            var timeWorker = new Worker("/scripts/time-worker.js");
            timeWorker.addEventListener("message", function(e){
                if(e.data.timeTracked){
                    app.updateTaskTimerElemenent(taskId, e.data.timeFormatted);
                } else if (e.data.error){
                    console.warn(e.data);
                } else {
                    console.log(e.data);
                }
            },false);

            timeWorker.postMessage({
                cmd: "startTimer",
                startTime: task.timerStart
            });

            me.timeWorkers[taskId] = timeWorker;
        },
        hardStopTimer: function(taskId){
            var me = this;
            if(me.timeWorkers[taskId] != undefined) {
                me.timeWorkers[taskId].terminate();
                me.timeWorkers[taskId] = undefined;
                delete me.timeWorkers[taskId];
            }
        },
        getTask: function(taskId){
            var me = this;
            let index = me.tasks.findIndex(function(task){
                return task.id == taskId;
            });

            return me.tasks[index];
        },
        search: function(searchTerm){
            var me = this;

            return new Promise(function(resolve, reject){
                try {
                    let searchTermLower = searchTerm.toLowerCase();
                    let foundTasks = me.tasks.filter(function (task) {
                        if (task.name.toLowerCase().search(searchTermLower) != -1)
                            return true;
                        else if (task.contentType.toLowerCase().search(searchTermLower) != -1)
                            return true;
                        else if (task.description.toLowerCase().search(searchTermLower) != -1)
                            return true;

                        // remove from view
                        app.removeTaskViewElement(task.id);
                        return false;
                    });

                    // todo render sorted by time left
                    foundTasks.forEach(function (task) {
                        app.updateTaskViewElement(task);
                    });

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        },
        getTasksBySearchTermCaseSense: function(searchTerm){
            var me = this;
            return me.tasks.filter(function(task){
                if(task.name.search(searchTerm) != -1)
                    return true;
                else if(task.contentType.search(searchTerm) != -1)
                    return true;
                else
                    return task.description.search(searchTerm) != -1;
            })
        }
    };


    // single Task prototype
    var Task = function(id, name, options){
        if(options.deadlineHour == "" && options.deadlineMinutes == undefined){
            options.deadlineHour = "00";
            options.deadlineMinutes = "00";
        }

        options = extend({
            prio: 1,
            deadlineMinutes: undefined,
            deadlineHour: undefined,
            deadlineDay: undefined,
            deadlineMonth: undefined,
            deadlineYear: undefined,
            state: "new",
            contentType: "default",
            description: undefined,
            timeMust: 0,
            timeHas: 0
        }, options);
        extend(this, options);

        var creationDate = new Date();

        var timeLeft = null;
        if(options.deadlineDay != undefined){
            var deadline = new Date(
                options.deadlineYear,
                options.deadlineMonth-1,  // JavaScript months are from 0 to 11, app saves it 1-12
                options.deadlineDay,
                options.deadlineHour,
                options.deadlineMinutes,
                0,
                0);
            timeLeft = Math.floor((deadline - creationDate)/1000/60/60);
        }else{
            timeLeft = -100; // a number value is always needed, otherwise IDBObjectStore index sort by timeLeft is ignoring this entry
        }

        this.id = id;
        this.name = name;
        this.createDate = creationDate;
        this.createDateVisible = creationDate.getDate()+"."+(creationDate.getMonth()+1)+"."+creationDate.getFullYear();
        this.timeLeft = timeLeft;
        this.alerted = false;
        this.checkInTime = null;
        this.checkOutTime = null;
        this.summedWorkingTime = null;
        this.summedPausedTime = null;
        this.timerStart = null;
    };

    app.notificationService = {
        serviceWorkerRegistration: null,
        init: function(){
            var me = this;

            me.initSystemNotification();
            me.initPushNotification();
        },
        initSystemNotification: function(){
            if (!"Notification" in window) {
                console.warn("System notifications isn\'t supported.");
            }else if (Notification.permission !== 'denied') {
                // Ask the user for permission
                // Note, Chrome does not implement the permission static property
                // So we have to check for NOT 'denied' instead of 'default'
                Notification.requestPermission(function (permission) {

                    // Whatever the user answers, we make sure Chrome stores the information
                    if(!('permission' in Notification)) {
                        Notification.permission = permission;
                    }
                });
            }
        },
        initPushNotification: function(){
            var me = this;
            // Are Notifications supported in the service worker?
            if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
                console.warn('Notifications aren\'t supported.');
                return;
            }

            // Check if push messaging is supported
            if (!('PushManager' in window)) {
                console.warn('Push messaging isn\'t supported.');
                return;
            }

            // wait for service worker ready
            navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                var registration = me.serviceWorkerRegistration = serviceWorkerRegistration;
                // ask for subscription
                serviceWorkerRegistration.pushManager.getSubscription()
                    .then(function(subscription) {
                        // todo: subscription UI for the user

                        if (!subscription) {
                            // subscribe to puah messaging
                            registration.pushManager.subscribe({
                                userVisibleOnly: true
                            }).then(function(sub) {
                                console.log('endpoint:', sub.endpoint);
                                let splittedEndpoint = sub.endpoint.split('/');
                                let params = 'regId='+splittedEndpoint[splittedEndpoint.length-1]+'&userAgent='+encodeURIComponent(navigator.userAgent);
                                app.ajaxService.fetch('GET', app.apiRoute+'/register.php?'+params);

                                app.notificationService.createSystemNotification("System Notifitcation", "Task Planer app ready");
                            })
                            .catch(function(err) {
                                console.warn('Error during push subscription', err);
                            });
                        }
                    })
                    .catch(function(err) {
                        console.warn('Error during getSubscription()', err);
                    });
            });
        },
        createSystemNotification: function(title, message, icon){
            var me = this;
            if (Notification.permission === "granted") {
                try {
                    // On desktop. But will be deprecated soon
                    var notification = new Notification(title, { body: message, icon: icon });
                } catch (e) {
                    // on mobile
                    console.log(e);
                    me.serviceWorkerRegistration.showNotification(title, { body: message, icon: icon })
                }
                //window.navigator.vibrate(500);
            }
        },
        toastHandler: {
            view: document.querySelector('.toast-view'),
            hideTimeout: 0,
            hide: function () {
                var me = this;
                me.view.classList.remove('toast-view--visible');
            },
            createToastNotification: function(message){
                var me = this;

                me.view.textContent = message;
                me.view.classList.add('toast-view--visible');

                clearTimeout(me.hideTimeout);
                me.hideTimeout = setTimeout(me.hide.bind(me), 3000);
            }
        }
    };

    /*****************************************************************************
     * Code required to start the app
     ****************************************************************************/

    // TODO dev only dump data; delete after finished
    /*app.pubSubBroker.subscribe('taskplaner/onTaskManagerReady', function(){
    // set up some dump data
        for (let i = 0; i<1000; i++) {
            app.taskManager.addNewTask(i+"Aufgabe", {
            prio: 1,
            deadlineMinutes: 15,
            deadlineHour: 10,
            deadlineDay: 27,
            deadlineMonth: 5,
            deadlineYear: 2016,
            state: 2,
            contentType: "default",
            description: "Bescheriebung der aufgabe",
            timeMust: 10,
            timeHas: 0
            });
        }

        //        app.taskManager.tasks.forEach(function(task) {
        //            console.log("timer");
        //            app.taskManager.toggleTimer(task.id);
        //        });
    });*/


    // Set up task managing
    app.taskManager.init();

    // set up notification service
    app.notificationService.init();

    //Progressive service worker feature check
    if('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('service-worker.js')
            .then(function(registration) {
                console.log('Service Worker Registered');
            })
            .catch(function(err) {
                console.log("Failed at register Service Worker.", err);
            });
    }else{
        app.notificationService.toastHandler.createToastNotification("No standalone support");
    }

    /**
     * Utility functions
     */
    // helps to extend Object properties. Needed e.g for optional object parameters
    function extend(target, source){
        if(source){
            for(var key in source){
                var val = source[key];
                if(typeof val !== "undefined"){
                    target[key] = val;
                }
            }
        }
        return target;
    }

    // Used to create global unique identifiers for the user tasks
    function guid() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
})();
