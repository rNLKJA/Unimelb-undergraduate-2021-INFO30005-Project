// From week 7 lecture 2
var register = function(Handlebars) {
    var helpers = {
        testTime: function () {
            return "hello";
        },
        currentTime: function() {
            var today = new Date()
            var hour = today.getHours()
            var discountMin = today.getMinutes();
            return hour + ':' + discountMin + ':' + today.getSeconds()
        },
        json: function(content){
            return JSON.stringify(content);
        },
        objectList: function(){
            var object=[]
            for (let i of arguments[0]){
                object.push(JSON.stringify(i));
            }
            return object
        }
    };
  
    if (Handlebars && typeof Handlebars.registerHelper === "function") {
      // register helpers
      // for each helper defined above (we have only one, listfood)
      for (var prop in helpers) {
          // we register helper using the registerHelper method
          Handlebars.registerHelper(prop, helpers[prop]);
      }
    } else {
        // just return helpers object if we can't register helpers here
        return helpers;
    }
  
  };
  
  // export helpers to be used in our express app
  module.exports.register = register;
  module.exports.helpers = register(null);    
  