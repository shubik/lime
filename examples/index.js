var Lime = require('../lib/lime'),
    pub = new Lime(),
    sub = new Lime();

sub.join('test');

sub.on('foo', function(data) {
    console.log('sub event foo:', data);
    sub.leave().quit();
});

pub.join('test').emit('foo', 'bar');
pub.leave('test').leave().quit();