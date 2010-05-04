// credit: Martin's blog
// http://www.martienus.com/code/javascript-remove-duplicates-from-array.html
var unique = function (arr) {
    var r = new Array();
    o:for(var i = 0, n = arr.length; i < n; i++) {
        for(var x = 0, y = r.length; x < y; x++) {
                if(r[x]==arr[i]) {
                        continue o;
                }
        }
        r[r.length] = arr[i];
    }
    return r;
}

var obj_merge = function(destination, source) {
    for (var attrname in source) {
        destination[attrname] = source[attrname];
    }
    return destination;
}

var xml = require('./libxmljs'),
    fs = require('fs'),
    sys = require('sys');

var type_conversion = {
    'path' : 'shortstr',
    'known hosts' : 'shortstr',
    'known-hosts' : 'shortstr',
    'reply code' : 'short',
    'reply-code' : 'short',
    'reply text' : 'shortstr',
    'reply-text' : 'shortstr',
    'class id' : 'short',
    'class-id' : 'short',
    'method id' : 'short',
    'method-id' : 'short',
    'channel-id' : 'longstr',
    'access ticket' : 'short',
    'access-ticket' : 'short',
    'exchange name' : 'shortstr',
    'exchange-name' : 'shortstr',
    'queue name' : 'shortstr',
    'queue-name' : 'shortstr',
    'consumer tag' : 'shortstr',
    'consumer-tag' : 'shortstr',
    'delivery tag' : 'longlong',
    'delivery-tag' : 'longlong',
    'redelivered' : 'bit',
    'no ack' : 'bit',
    'no-ack' : 'bit',
    'no local' : 'bit',
    'no-local' : 'bit',
    'peer properties' : 'table',
    'peer-properties' : 'table',
    'destination' : 'shortstr',
    'duration' : 'longlong',
    'security-token' : 'longstr',
    'reject-code' : 'short',
    'reject-text' : 'shortstr',
    'offset' : 'longlong',
    'no-wait' : 'bit',
    'message-count' : 'long'
};

// AMQP specification details
var spec_details = function(doc) {

  var spec_details = {};

  var root = doc.get('/amqp');
  spec_details.major = root.attr('major').value();
  spec_details.minor = root.attr('minor').value();
  if (root.attr('revision')) {
    spec_details.revision = root.attr('revision').value()
  } else {
    spec_details.revision =  '0';
  }
  spec_details.port = root.attr('port').value();
  if (root.attr('comment')) {
    spec_details.comment = root.attr('comment').value();
  } else {
    spec_details.comment = 'No comment';
  }

  return spec_details;
}

var add_methods = function(major, minor, revision) {
  var meth_arr = [];

  if (major == '8' && minor == '0' && revision == '0') {
    //# Add Queue Unbind method
    meth_arr.push({
         'name' : 'unbind',
         'index' : '50',
         'fields' : [
             {'name' : 'ticket', 'domain' : 'short'},
             {'name' : 'queue', 'domain' : 'shortstr'},
             {'name' : 'exchange', 'domain' : 'shortstr'},
             {'name' : 'routing_key', 'domain' : 'shortstr'},
             {'name' : 'arguments', 'domain' : 'table'}
         ]
    });

    //# Add Queue Unbind-ok method
    meth_arr.push({
     'name' : 'unbind-ok',
     'index' : '51',
     'fields' : []
    });
    
    return meth_arr;
  }

  // # Return methods
  return meth_arr;

}

// AMQP Classes
var classes = function(doc, major, minor, revision) {
  // AMQP classes

  var cls_arr = [];

  var classes = doc.find('/amqp/class');
  for (var element_id in classes) {
    var element = classes[element_id];
    var cls_hash = {}
    cls_hash.name = element.attr('name').value();
    cls_hash.index = element.attr('index').value();
    
    //# Get fields for class
    var field_arr = fields(doc, element);
    cls_hash.fields = field_arr;
    
    //# Get methods for class
    var meth_arr = class_methods(doc, element);
    //# Add missing methods
    var add_arr = {};
    if (cls_hash.name == 'queue') {
        add_arr = add_methods(major, minor, revision)
    }

    var method_arr = meth_arr.concat(add_arr);

    //# Add array to class hash
    cls_hash.methods = method_arr;
    cls_arr.push(cls_hash);
  }

  // Return class information array
  return cls_arr;
}

// Fields
var fields = function(doc, element) {
  var field_arr = [];

  //# Get fields for element
  var fields = element.find('./field');

  for (var field_id in fields) {
   var field = fields[field_id];

    var field_hash = {};

    field_hash.name = field.attr('name').value().replace(/^\s*([\S\s]*?)\s*$/, '$1').replace(/^\-*([\S\s]*?)\-*$/, '$1');
    if (field.attr('type')) {
        field_hash.domain = field.attr('type').value()
    } else {
        field_hash.domain = field.attr('domain').value();
    }

    //# Convert domain type if necessary
    // sys.puts('Conversion array: ' + JSON.stringify(conv_arr));
    var conv_arr = convert_type(field_hash.domain);
    
    if (conv_arr[field_hash.domain]) {
        field_hash.domain = conv_arr[field_hash.domain];
    }

    field_arr.push(field_hash);
  }

  // #  Return fields
  //sys.puts('Returning fields: ' + JSON.stringify(field_arr));

  return field_arr;

}

var convert_type = function(name) {
  var type_arr = {};
  for(var conversion in type_conversion) {
      if (conversion == name) {
          type_arr[name] = type_conversion[conversion];
      }
  }
  return type_arr;
}

var class_methods = function(doc, cls) {
  var meth_arr = [];

  //# Get methods for class
  var methods = cls.find('./method');
  for (var method_id in methods) {
    var method = methods[method_id];

    var meth_hash = {};
    meth_hash.name = method.attr('name').value();
    meth_hash.index = method.attr('index').value();
    //# Get fields for method
    var field_arr = fields(doc, method);
    meth_hash.fields = field_arr;
    meth_arr.push(meth_hash);
  }

  // # Return methods

  //sys.puts('Returning methods: ' + JSON.stringify(meth_arr));
  return meth_arr;
}

// Add types depending on version
var add_types = function(major, minor, revision) {
  var type_arr = [];
  if (major == '8' && minor == '0' && revision == '0') {
    type_arr = ['long', 'longstr', 'octet', 'timestamp'];
  }
  return type_arr;
}

// AMQP domain types
var domain_types = function(doc, major, minor, revision) {
  var dt_arr = [];
  var domains = doc.find('/amqp/domain');
  for (var domain_id in domains) {
     var element = domains[domain_id];
     dt_arr.push(element.attr('type').value());
  }

  //# Add domain types for specific document
  var add_arr = add_types(major, minor, revision);
  var type_arr = dt_arr.concat(add_arr);

  //# Return sorted array
  // sys.puts('Type of domains returned: ' + (typeof type_arr));
  return unique(type_arr);
}

// Start of main program
//
// Read in spec file

var spec_file = fs.readFileSync( process.argv[2], 'UTF-8');

var doc = xml.parseXmlString(spec_file);


var toLowerCase = function(str) {
    return str.toLowerCase();
}

var process_constants = function(doc) {
  //# AMQP constants

  var frame_constants = {}
  var other_constants = {}

  var elements = doc.find('//constant');
  for (var element_id in elements) {
    var element = elements[element_id];
    if (element.attr('name') && element.attr('name').value().toString().substr(0,5) == 'frame') {
      var const_id = parseInt(element.attr('value').value());
      var final_name = element.attr('name').value().substr(6).split('-').map(toLowerCase).map(camelcase).join('');
      // frame_constants[element['value'].to_i] = element['name'].sub(/^frame./,'').split(/\s|-/).map{|w| w.downcase.capitalize}.join();

      frame_constants[const_id] = final_name;
    } else {
      other_constants[element.attr('value').value()] = element.attr('name').value();
    }
  }

  return [frame_constants, other_constants];
}

function camelcase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var spec_info = spec_details(doc);

//sys.puts('specs: ' + JSON.stringify(spec_info));

// Constants
var constants = process_constants(doc);

//sys.puts('constants: ' + JSON.stringify(constants));
// Frame constants
var frame_constants = [];
var frame_footers = [];

for (var const_key in constants[0]) {
    if (const_key <= 8) { 
        frame_constants.push(constants[0][const_key]);
    }
    if (constants[0][const_key] == 'End') {
        frame_footers.push(constants[0][const_key]);
    }
}

//sys.puts('frame footers: ' + JSON.stringify(frame_footers));
var frame_footer = frame_footers[0][0];

// Other constants
var other_constants = constants[1];

// Domain types
var data_types = domain_types(doc, spec_info.major, spec_info.minor, spec_info.revision);

// Class definitions
var class_defs = classes(doc, spec_info.major, spec_info.minor, spec_info.revision);

var format_name = function (name) {

    return name.split('-').map(camelcase).join('');

}

var obj = {};

for (klass_id in class_defs) {

  var klass = class_defs[klass_id];
  var methods = {};
  // sys.puts('Describing class ' + klass.name + ' with methods ' + JSON.stringify(klass.methods));
  for (method_id in klass.methods) {
    var method = klass.methods[method_id];

    // sys.puts('Formatting method for ' + klass.name + ' class: ' + JSON.stringify(method));
    if (method.name) {
        methods[format_name(method.name)] = [parseInt(klass.index), parseInt(method.index)].concat(method.fields.map(function(x){return x.domain}));
    }

  }

  obj[camelcase(klass.name)] = methods;
}

//sys.puts(JSON.stringify(obj));

fs.writeFileSync('lib/amqp/constants-generated.js', 'process.mixin(exports, ' + JSON.stringify(obj) + ')', encoding='ascii');