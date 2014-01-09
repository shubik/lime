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


sub.on('age:36', function(data) {
    console.log('age:36 without boundary', data);
});

sub.on('age:36', { boundary: true }, function(data) {
    console.log('age:36 with boundary', data);
});

sub.on('age:*', { boundary: true }, function(data) {
    console.log('age:* with boundary', data);
});

sub.on('name:alex', 'age:*', { boundary: true }, function(data) {
    console.log('name:alex::age:* with boundary', data);
});

sub.on('name:alex::age:36', { boundary: true }, function(data) {
    console.log('name:alex::age:36 with boundary', data);
});


// Emit

pub.join('test').emit('foo', 'bar');
pub.emit('company.123', 'user.3456', { payload: 123 });
pub.emit('name:alex::age:36', 1);
pub.emit('name:alex', 'age:36', 2);

//pub.leave('test').leave().quit();
//sub.leave().quit();