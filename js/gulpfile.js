// **********************************************************************
//
// Copyright (c) 2003-2015 ZeroC, Inc. All rights reserved.
//
// This copy of Ice is licensed to you under the terms described in the
// ICE_LICENSE file included in this distribution.
//
// **********************************************************************

var bower       = require("bower");
var browserSync = require("browser-sync");
var concat      = require('gulp-concat');
var del         = require("del");
var extreplace  = require("gulp-ext-replace");
var gulp        = require("gulp");
var gzip        = require("gulp-gzip");
var minifycss   = require('gulp-minify-css');
var newer       = require('gulp-newer');
var open        = require("gulp-open");
var path        = require("path");
var paths       = require('vinyl-paths');
var slice2js    = require("gulp-zeroc-slice2js");
var uglify      = require("gulp-uglify");

var HttpServer  = require("./bin/HttpServer");

var common =
{
    "scripts": [
        "bower_components/foundation/js/vendor/modernizr.js",
        "bower_components/foundation/js/vendor/jquery.js",
        "bower_components/foundation/js/foundation.min.js",
        "bower_components/nouislider/distribute/jquery.nouislider.all.js",
        "bower_components/animo.js/animo.js",
        "bower_components/spin.js/spin.js",
        "bower_components/spin.js/jquery.spin.js",
        "bower_components/highlightjs/highlight.pack.js",
        "assets/icejs.js"],
    "styles":
        ["bower_components/foundation/css/foundation.css",
         "bower_components/animo.js/animate+animo.css",
         "bower_components/highlightjs/styles/vs.css",
         "bower_components/nouislider/distribute/jquery.nouislider.min.css",
         "assets/icejs.css"]
};

gulp.task("dist:libs", ["bower"],
    function()
    {
        return gulp.src(["bower_components/zeroc-icejs/lib/*"])
            .pipe(newer("lib"))
            .pipe(gulp.dest("lib"));
    });

gulp.task("bower", [],
    function(cb)
    {
        bower.commands.install().on("end", function(){ cb(); });
    });

gulp.task("common:js", ["bower"],
    function()
    {
        return gulp.src(common.scripts)
            .pipe(newer("assets/common.min.js"))
            .pipe(concat("common.min.js"))
            .pipe(uglify())
            .pipe(gulp.dest("assets"))
            .pipe(gzip())
            .pipe(gulp.dest("assets"));
    });

gulp.task("common:js:watch", ["common:js"],
    function()
    {
        gulp.watch(common.scripts, function(e){
            gulp.start("common:js", function(){
                browserSync.reload(e.path);
            });
        });
    });

gulp.task("common:css", ["bower"],
    function()
    {
        return gulp.src(common.styles)
            .pipe(newer("assets/common.css"))
            .pipe(concat("common.css"))
            .pipe(minifycss())
            .pipe(gulp.dest("assets"))
            .pipe(gzip())
            .pipe(gulp.dest("assets"));
    });

gulp.task("common:css:watch", ["common:css"],
    function()
    {
        gulp.watch(common.styles, function(e){
            gulp.start("common:css", function(){
                browserSync.reload(e.path);
            });
        });
    });

gulp.task("common:clean", [],
    function()
    {
        del(["assets/common.css", "assets/common.min.js"]);
    });

var demos = [
    "Ice/hello",
    "Ice/throughput",
    "Ice/minimal",
    "Ice/latency",
    "Ice/bidir",
    "Glacier2/chat",
    "ChatDemo"];

function demoTaskName(name) { return "demo_" + name.replace("/", "_"); }
function demoWatchTask(name) { return demoTaskName(name) + ":watch"; }
function demoCleanTask(name) { return demoTaskName(name) + ":clean"; }
function demoGeneratedFile(file){ return path.join(path.basename(file, ".ice") + ".js"); }

demos.forEach(
    function(name)
    {
        gulp.task(demoTaskName(name), [],
            function()
            {
                return gulp.src(path.join(name, "*.ice"))
                    .pipe(slice2js({args: ["-I" + name], dest: name}))
                    .pipe(gulp.dest(name));
            });

        gulp.task(demoWatchTask(name), [demoTaskName(name)],
            function()
            {
                gulp.watch(path.join(name, "*.ice"), [demoTaskName(name)]);

                gulp.watch([path.join(name, "*.js"),
                            path.join(name, "browser", "*.js"),
                            path.join(name, "*.html")], 
                    function(){
                        browserSync.reload(e.path);
                    });
            });

        gulp.task(demoCleanTask(name), [],
            function()
            {
                return gulp.src(path.join(name, "*.ice"))
                    .pipe(extreplace(".js"))
                    .pipe(paths(del));
            });
    });

var minDemos =
{
    "Ice/minimal":
    {
        srcs: [
            "lib/Ice.min.js",
            "Ice/minimal/Hello.js",
            "Ice/minimal/browser/Client.js"],
        dest: "Ice/minimal/browser/"
    },
    "ChatDemo":
    {
        srcs: [
            "lib/Ice.min.js",
            "lib/Glacier2.min.js",
            "ChatDemo/Chat.js",
            "ChatDemo/ChatSession.js",
            "ChatDemo/Client.js"],
        dest: "ChatDemo"
    }
};

function minDemoTaskName(name) { return demoTaskName(name) + ":min"; }
function minDemoWatchTaskName(name) { return minDemoTaskName(name) + ":watch"; }
function minDemoCleanTaskName(name) { return minDemoTaskName(name) + ":clean"; }

Object.keys(minDemos).forEach(
    function(name)
    {
        var demo = minDemos[name];

        gulp.task(minDemoTaskName(name), [demoTaskName(name), "common:css", "common:js", "dist:libs"],
            function()
            {
                return gulp.src(demo.srcs)
                    .pipe(newer(path.join(demo.dest, "Client.min.js")))
                    .pipe(concat("Client.min.js"))
                    .pipe(uglify())
                    .pipe(gulp.dest(demo.dest))
                    .pipe(gzip())
                    .pipe(gulp.dest(demo.dest));
            });

        gulp.task(minDemoWatchTaskName(name), [minDemoTaskName(name)],
            function()
            {
                gulp.watch(demo.srcs, [minDemoTaskName(name)]);
            });

        gulp.task(minDemoCleanTaskName(name), [],
            function()
            {
                del([path.join(demo.dest, "Client.min.js"),
                     path.join(demo.dest, "Client.min.js.gz")]);
            });
    });

gulp.task("demo:build", demos.map(demoTaskName).concat(Object.keys(minDemos).map(minDemoTaskName)));
gulp.task("demo:watch", demos.map(demoWatchTask).concat(Object.keys(minDemos).map(minDemoWatchTaskName)));
gulp.task("demo:clean", demos.map(demoCleanTask).concat(Object.keys(minDemos).map(minDemoCleanTaskName)));

gulp.task("build", ["demo:build"]);

gulp.task("watch", ["demo:build", "dist:libs", "demo:watch", "common:css:watch", "common:js:watch"],
    function()
    {
        browserSync();
        HttpServer();
        return gulp.src("./index.html").pipe(open("", {url: "http://127.0.0.1:8080/index.html"}));
    });
gulp.task("clean", ["demo:clean", "common:clean"]);
gulp.task("default", ["build"]);
