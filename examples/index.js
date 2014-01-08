var Lime = require('../lib/lime'),
    pub = new Lime(),
    sub = new Lime();

sub.join('test');

sub.on('foo', function(data) {
    console.log('sub event foo:', data);
    //sub.leave().quit();
});

sub.on('o', function(data) {
    console.log('sub event o:', data);
    //sub.leave().quit();
});


sub.on('*', function(data) {
    console.log('sub wildcard event *', data);
    //sub.leave().quit();
});

pub.join('test').emit('foo', 'bar');

//pub.leave('test').leave().quit();
//sub.leave().quit();