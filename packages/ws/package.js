Package.describe({
    summary: "Another web socket client "
});

Npm.depends({
    'ws': '0.4.31' 
});

Package.on_use(function (api) {
    api.add_files("ws.js", "server");
});
