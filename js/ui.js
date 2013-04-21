// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
//
// From: http://stackoverflow.com/questions/12538344/asynchronous-keyup-events
// -how-to-short-circuit-sequential-keyup-events-for-speed 
var debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, arps = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) {
                func.apply(context, arps);
            }
        };
        if (immediate && !timeout) {
            func.apply(context, arps);
        }

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};


/**
 * ui namespace
 */
var ui = new function () {
  
  var self = this;

  var counter = 0;
  var totalCount = 0;
  var db = null;
  var crawlOptions = null;


  self.init = function (options, total, parentId) {
    crawlOptions = options;
    totalCount = total;

    self.createForm(parentId);
    self.initDB();
    self.initSelects();

    // bind events
    // update index
    $("#ku-ps-btn-update").on("click", self.crawl);

    // search on keyUp
    $("#ku-ps-search").on("keyup", debounce(self.search, 300));

    // prevent submit on enter
    $("#ku-ps-search").closest("form").submit(function (e) {
      e.preventDefault();
    });

    // search on category change
    $("#ku-ps-cat-select").on("change", self.search);

    // search on sub category change
    $("#ku-ps-subcat-select").on("change", self.search);

    // if the first weekday of a new month has passed, update index
    self.checkTime();
  };


  self.createForm = function (parent) {
    var html = $('<div id="ku-purchase-search">\
      <div class="ku-ps-wrap">\
        <h6 class="ku-ps-title">Search for person</h6>\
        <div class="ku-ps-options">\
          <div id="ku-ps-progress-wrap">\
            <span id="ku-ps-data">Updating index..</span>\
            <div id="ku-ps-progress" class="progress progress-striped active">\
              <div id="ku-ps-bar" class="bar"></div>\
            </div>\
          </div>\
        <select id="ku-ps-fac-select">\
          <option value="all">Faculty (All)</option>\
        </select>\
        <select id="ku-ps-ins-select">\
          <option value="all">Institute (All)</option>\
        </select>\
        <select id="ku-ps-cat-select">\
          <option value="all">Category (All)</option>\
        </select>\
        <select id="ku-ps-role-select">\
          <option value="all">Role (All)</option>\
        </select>\
          <button type="button" id="ku-ps-btn-update" class="btn">\
          Update Index</button>\
        <span id="ku-ps-btn-desc"></span>\
      </div>\
        <input type="text" name="search" id="ku-ps-search"\
        placeholder="Search for name..">\
        <div id="ku-ps-results">\
        </div>\
      </div>\
    </div>');

    $(parent).prepend(html);
  };


  self.initSelects = function () {
    var data = self.loadData();

    if (data && data.sort) {
      var facSelect = $("#ku-ps-fac-select");
      var insSelect = $("#ku-ps-ins-select");
      var catSelect = $("#ku-ps-cat-select");
      var roleSelect = $("#ku-ps-role-select");

      // clear selects
      facSelect.html('<option value="all">Faculty (All)</option>');
      insSelect.html('<option value="all">Institute (All)</option>');
      catSelect.html('<option value="all">Category (All)</option>');
      roleSelect.html('<option value="all">Role (All)</option>');

      $(data.sort.faculties).each(function (i, fac) {
        facSelect.append('<option value="' + fac + '">' + fac + '</option>');
      });

      $(data.sort.institutes).each(function (i, ins) {
        insSelect.append('<option value="' + ins + '">' + ins + '</option>');
      });

      $(data.sort.categories).each(function (i, cat) {
        catSelect.append('<option value="' + cat + '">' + cat + '</option>');
      });

      $(data.sort.roles).each(function (i, role) {
        roleSelect.append('<option value="'+ role + '">' + role + '</option>');
      });
    }
  };


  self.showResults = function (query) {
    var html = $('<div class="ku-ps-result">\
                  <div class="ku-ps-result-name">' + query.name + '</div>\
                  <div class="ku-ps-result-sub"><span>Faculty:</span> ' +
                  query.faculty + '</div>\
                  <div class="ku-ps-result-sub"><span>Institute:</span> ' +
                  query.institute + '</div>\
                  <div class="ku-ps-result-sub"><span>Categori:</span> ' +
                  query.category + '</div>\
                  <div class="ku-ps-result-sub"><span>Role:</span> ' +
                  query.role + '</div></div>');

    $("#ku-ps-results").append(html);
  };


  self.initDB = function () {
    var data = self.loadData();

    if (data && data.persons) {
      // setup taffyDB
      var table = TAFFY(data.persons);

      // update totalcount
      totalCount = data.persons.length;

      db = table;
      self.updateBtn("ok");
    } else {
      db = null;
      self.updateBtn("none");
    }
  };


  self.loadData = function () {
    if (typeof localStorage["sort_options"] === "undefined" ||
        typeof localStorage["persons"] === "undefined" ||
        typeof localStorage["time"] === "undefined") {
      data = null;
    } else {
      var sortOptions = JSON.parse(localStorage["sort_options"]);
      var persons = JSON.parse(localStorage["persons"]);
      var time = parseInt(localStorage["time"]);

      var data = { sort: sortOptions,
                   persons: persons,
                   time: time
      };
      
      if (typeof time === "undefined") {
        data = null;
      }
    }

    return data;
  };


  self.saveData = function (sortOptions, persons) {
    localStorage["sort_options"] = JSON.stringify(sortOptions);
    localStorage["persons"] = JSON.stringify(persons);
    localStorage["time"] = Date.now();
  };


  self.increaseCount = function () {
    counter++;
    self.updateProgress();
  };


  self.updateProgress = function () {
    var progress = 0;

    if (counter > totalCount) {
      progress = 100;
    } else if (counter > 0) {
      progress = counter/totalCount * 100;
    }

    if (progress > 100) {
      progress = 100;
    }
    $("#ku-ps-bar").css("width", "" + progress + "%");
  };


  self.resetCounter = function () {
    counter = 0;
  };


  self.checkTime = function () {
    var data = self.loadData();

    if (data && data.time) {
      var date = new Date();
      var y = date.getFullYear();
      var m = date.getMonth();

      var weekday = getFirstWeekday(y,m);

      if (data.time > weekday.getTime()) {
        return;
      }
    }

    // if data.time isn't set we update
    $("#ku-ps-btn-update").trigger("click");
  };


  var getFirstWeekday = function (year, month) {
    var firstDay = new Date(year, month, 1);

    switch (firstDay.getDay) {
      case 1:
      case 2:
      case 3:
      case 4:
        return firstDay.getDate()+1;
        break;
      case 5:
      case 6:
        return firstDay.getDate()+3;
        break;
      case 0:
        return firstDay.getDate()+2;
        break;
      default:
        return firstDay;
    }
  };


  self.search = function () {
      self.query().done(function (msg) {
        return;
      })
      .fail(function (err) {
        console.log(err);
      });
  };


  self.query = function () {
    var term = $("#ku-ps-search").val();

    // Make the query operation async
    var dfd = $.Deferred();

    if (term.length > 1) {
      //continue
      $("#ku-ps-results").empty();

      if (db) {
        // build query
        var query = {name:{likenocase:term}};

        // Check selects
        var fac = $("#ku-ps-fac-select").val();
        var ins = $("#ku-ps-ins-select").val();
        var cat = $("#ku-ps-cat-select").val();
        var role = $("#ku-ps-role-select").val();

        if (fac !== "all") {
          $.extend(query, {faculty:{is:fac}});
        }
        if (ins !== "all") {
          $.extend(query, {institute:{is:ins}});
        }
        if (cat !== "all") {
          $.extend(query, {category:{is:cat}});
        }
        if (role !== "all") {
          $.extend(query, {role:{is:role}});
        }

        var records = db([query]);
        records.each(function (record) {
          self.showResults(record);
        });
        dfd.resolve("complete!");
      } else {
        self.updateBtn("none");
        dfd.fail("No DB");

      }

    } else if (term.length == 0) {
      $("#ku-ps-results").empty();
      dfd.fail("Searchterm empty");
    }
    return dfd.promise();
  };


  self.crawl = function () {
    self.resetCounter();
    
    $("#ku-ps-progress-wrap").show();

    Crawler.init(crawlOptions);
    Crawler.crawl(self.increaseCount).done(function (persons) {
      var db = TAFFY(persons);

      var faculties = db().distinct("faculty");
      var institutes = db().distinct("institute");
      var categories = db().distinct("category");
      var roles = db().distinct("role");

      var sortOptions = { faculties: faculties,
                          institutes: institutes,
                          categories: categories,
                          roles: roles
      };

      self.saveData(sortOptions,persons);
      self.initDB();
      self.initSelects();
      self.updateBtn("ok", persons.length);
    });
  };


  self.updateBtn = function (status) {
    $("#ku-ps-btn-desc").empty();

    switch (status) {
      case "none":
        var bClass = "danger";
        // disable search field
        $("#ku-ps-search").attr('disabled', true);
        $("#ku-ps-btn-desc").html("Index needs to be updated.");
        break;
      case "old":
        var bClass = "warning";
        break;
      case "ok":
        var bClass = "success";
        if (typeof arguments[1] !== "undefined") {
          $("#ku-ps-btn-desc").html(arguments[1] + " persons indexed.");
        }
        // enable search field
        $("#ku-ps-search").attr('disabled', false);
        break;
      default:
        console.log("Invalid status");
    }

    var btnClass = "btn btn-" + bClass;
    var descClass = "ku-ps-btn-desc-" + bClass;

    $("#ku-ps-progress-wrap").fadeOut("fast");
    $("#ku-ps-bar").css('width', '0');
    $("#ku-ps-btn-update").removeClass(function (i, curr) {
      return curr;
    }).addClass(btnClass);

    $("#ku-ps-btn-desc").removeClass(function (i, curr) {
      return curr;
    }).addClass(descClass);
    $("#ku-ps-btn-desc").fadeIn("slow");
  };
};
