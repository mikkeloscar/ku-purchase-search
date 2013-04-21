var Crawler = {

  url: "",
  persons: [],
  asp_pattern: new RegExp("SubmitFormPost"),
  dpb_regex: new RegExp("[^\(\"]+(?=\"[\)])"),
  next_regex: new RegExp("next|næste", "i"),


  init: function (options) {
    Crawler.url = options.url;
  },


  parseURI: function (uri) {
    var new_uri = uri;

    var replace = [
      { orig: /\\u002f/g, new: "/" },
      { orig: /\\u0026/g, new: "&" },
      { orig: /\\u00252d/g, new: "-" },
      { orig: /\\u00257d/g, new: "%7d" },
      { orig: /\\u00257b/g, new: "%7b" }
    ];

    for (var i = 0; i < replace.length; i++) {
      new_uri = new_uri.replace(replace[i].orig, replace[i].new);
    }

    return new_uri;
  },


  crawl: function (callback) {
    var requestCounter = 0;
    var dfd = $.Deferred();

    function request (formData) {
      requestCounter++;
      return $.ajax({
          type: "POST",
          url: Crawler.url,
          data: formData
      }).always(function () {
        requestCounter--;
        // We might queue more requests in the done handler, so just in case
        // wait til the next event loop to dispatch the complete
        setTimeout(function () {
          if (!requestCounter) {
            dfd.resolve(Crawler.persons);
          }
        }, 0);
      });
    }

    function innerCrawl (html) {
      var more = false;

      var formData = null;

      if (typeof html === "undefined") { // Init call
        more = true;
      } else { // handle SubmitFormPost

        html = html.trim();

        $(html).find("a").each(function () {
          var onClick = $(this).attr("onclick");
          if (Crawler.asp_pattern.test(onClick)) {
            // We have found the navigation
            var img = $(this).find("img");
            if (Crawler.next_regex.test(img.attr("alt"))) {
              // We have found more pages
              more = true;
              // Parse SubmitFormPost args
              var result = onClick.match(Crawler.dpb_regex);
              Crawler.url = Crawler.parseURI(result[0]);
            }
          }
        });

        var theForm = $(html).find("form[name='aspnetForm']");
        formData = $(theForm).serialize();
      }

      if (more) {
        // crawl more pages
        request(formData).done(function (html) {
          var table = $(html.trim()).find(".ms-listviewtable")
          table.find("tr").each(function () {
            if ($(this).attr("class") !== "ms-viewheadertr" &&
                $(this).children("td:first").attr("class") === "ms-vb-title") {
              var faculty = null;
              var institute = null;
              var category = null;
              var role = null;
              var name = null;

              $(this).children("td").each(function (index) {
                switch (index) {
                  case 0:
                    faculty = $(this).find("a").html();
                    faculty = faculty.replace(/<.*/, "");
                    break;
                  case 1:
                    institute = $(this).html();
                    break;
                  case 2:
                    category = $(this).html();
                    break;
                  case 3:
                    role = $(this).html();
                    break;
                  case 4:
                    name = $(this).find(".ms-vb a").html();
                    break;
                  default:
                    console.log("found more tds");
                }
              });

              var person = { faculty: faculty,
                             institute: institute,
                             category: category,
                             role: role,
                             name: name
              };

              Crawler.persons.push(person);
            
              if (typeof callback !== "undefined") {
                // call callback function
                callback();
              }
            }
          });
          innerCrawl(html);
        });
      }
    }
    innerCrawl();
    return dfd.promise();
  }
}
