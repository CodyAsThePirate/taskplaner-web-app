/**
 * Created by Simon on 20.01.16.
 */
importScripts("deadline-helper.js");

self.addEventListener('message', function(e){

    if (e.data.cmd == "getTimeToDeadline") {
        self.postMessage("WORKER getTimeToDeadline");
        self.postMessage(e.data.tasks);
        DeadlineHelper.init()
            .then(function () {
                if (e.data.tasks)
                    return Promise.resolve(e.data.tasks);
                else
                    return DeadlineHelper.readTasksFromDb();
            })
            .then(function (tasks) {
                self.postMessage(DeadlineHelper.processTimeToDeadline(tasks));
            }, function (error) {
                self.postMessage(error);
            });
    } else if(e.data.cmd == "startTimer") {
        self.timerTick(e.data.startTime);
    }

},false);

self.timerTick = function(startTime){
    var me = self;
    let now = new Date();

    let milliSecTotal = now - startTime;

    let time = milliSecTotal;
    let hours = time / (60 * 60 * 1000);
    time = time % (60 * 60 * 1000);
    let minutes = time / (60 * 1000);
    time = time % (60 * 1000);
    let seconds = time / 1000 ;
    ms = time % 1000;

    self.postMessage({
        timeTracked: milliSecTotal,
        timeFormatted: (hours > 0 ? self.zeroFill(Math.floor(hours)) : "00") +":"
            +(minutes > 0 ? self.zeroFill(Math.floor(minutes)) : "00")
            +":"+(seconds > 0 ? self.zeroFill(Math.floor(seconds)) : "00")
    });

    let t = setTimeout(function(){me.timerTick(startTime)}, 500);
};

self.zeroFill = function(i){
    if (i<10){
        i = "0" + i;
    }
    return i;
};