
FileShareTests = function () {
    let dialogs = flm.ui.getDialogs();

    this.testErrors = function () {
        let deferred = $.Deferred();

        // invalid paths
        dialogs.showDialog('flm-create-share', {
            afterShow: (diagId) => {
                setTimeout(function () {
                    dialogs.updateTargetPath(diagId, '/');
                    // start
                    //console.log(diagId, flm.ui.getDialogs().startButton('#'+diagId), '#'+diagId);
                    dialogs.startButton(diagId).click();
                    dialogs.startedPromise.always(() => deferred.resolve())

                }, 1000)

            }
        });


        let promise = deferred.promise();

        promise.then(
            () => {
                // invalid duration
                let duration = $.Deferred();

                dialogs.showDialog('flm-create-share', {afterShow: (diagId) => {
                        setTimeout(function () {
                            dialogs.updateTargetPath(diagId, '/existing.file');
                            // start
                            //console.log(diagId, flm.ui.getDialogs().startButton('#'+diagId), '#'+diagId);
                            dialogs.startButton(diagId).click();
                            dialogs.startedPromise.always(function () {
                                duration.resolve();
                            });
                        }, 1)

                    }});
                return duration.promise();

            }
        ).then(function () {
            // invalid password

            let password = $.Deferred();

            dialogs.showDialog('flm-create-share', {afterShow: (diagId) => {
                    setTimeout(function () {
                        dialogs.updateTargetPath(diagId, '/document_5785042655306060094.mp4');
                        $('#FS_duration').val(0);

                        // start
                        dialogs.startButton(diagId).click();
                        dialogs.startedPromise.always(function () {
                            password.resolve();
                        });
                    }, 1)

                }});
            return password.promise();
        })

    }

    this.runTests = function() {
        this.testErrors.apply(window);
    }

    return this;
}

//
// injectScript('/plugins/filemanager-share/tests.js', () => FileShareTests().runTests());
