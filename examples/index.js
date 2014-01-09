var Lime = require('../lib/lime'),
    pub = new Lime(),
    sub = new Lime();

// Subscribe

sub.join('test');

sub.on('foo', function(data) {
    console.log('sub event foo:', data);
});

sub.on('fo', { replace: true, boundary: true }, function(data) {
    console.log('sub event fo:', data);
});

sub.on('*', function(data) {
    console.log('sub event *', data);
});

sub.on('company.*', function(data) {
    console.log('sub event company.*', data);
});

sub.on('company.*', 'user.*', function(data) {
    console.log('sub event company.* user.*', data);
});

sub.on('company.*', 'device.*', function(data) {
    console.log('sub event company.* user.*', data);
});


// Emit

pub.join('test').emit('foo', 'bar');
pub.join('test').emit('company.123', 'user.3456', { payload: 123 });

//pub.leave('test').leave().quit();
//sub.leave().quit();