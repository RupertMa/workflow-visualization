(function($) {

	var Compare = function(renderTo, dataCopy) {

		/* Private Variables */
		var module = this,
			$div,
			$dropdown1,
			$dropdownX,
			$plotDropdown,
			data = {},
			plotTypes = [],
			maxSelection = 10;

		/* Helper Functions */

		// @brief	converts display string to strings used as div names
		// @param	str 	input string
		// @return 	converted string
		var displayToEncoding = function(str) {
			return str.toLowerCase().replace(/\s+/g, '-');
		};

		// @brief	converts div string names to display string
		// @param	str 	input string
		// @return	converted string
		var encodingToDisplay = function(str) {
			return str.replace(/\w\S*/g, function(txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
		};

		// @brief	converts column type name to a format easier to work with
		// @param	type 	name of a column type
		// @return	converted column type
		var getType = function(type) {
			if(type === undefined || type == null) {
				return null;
			}
			else if(type["type"] == "numeric" || type["type"] == "nominal" || type["type"] == "discrete") {
				return type["type"];
			}
			else {
				return "others";
			}
		};

		/* Member Functions */

		// @brief	initialization code
		// @param	renderTo	the jQuery div object 
		//						that the module is rendered to
		// @param	dataCopy	the data used in the visualization 
		//						(data is shallow copied)
		module.init = function(renderTo, dataCopy) {
			$div = renderTo;
			$div.data("module-data", this);
			data = dataCopy;

			module.reset();
			$dropdown1 = $div.find(".col-dropdown").first().find(".fluid.dropdown");
			$dropdownX = $div.find(".col-dropdown").last().find(".fluid.dropdown");
			$plotDropdown = $div.find(".ui.settings.popup").find(".plot-dropdown").find(".fluid.dropdown");
			module.initPlotTypes();

			var availableIx = module.initGraphOptionDropdown();

			if(availableIx.length >= 2) {
				// init popup
				$div.find(".right.floated.meta").find(".link.icon").popup({
					popup: $div.find(".ui.settings.popup"),
					on: "click",
					position: "bottom right",
					variation: "wide"
				});

				// define dropdown action events
				$div.find(".col-dropdown").find(".fluid.dropdown").dropdown("setting", "onChange", function() {
					module.render();
					module.updateDescription();
				});

				var count = 0;
				availableIx.forEach(function(item) {
					if(count < 10) {
						$dropdownX.dropdown("set selected", item);
						count++;
					}
				});

				$dropdown1.dropdown("set value", "none");

				module.render();

				$div.removeClass("hidden");
			}
			else {
				console.log("No comparison graph to show");
				$div.addClass("hidden");
			}
		};

		// @brief	extract plot types from html and add click event handlers
		module.initPlotTypes = function() {
			$plotDropdown.find("option").each(function() {
				plotTypes.push($(this).attr("value"));
			});
			$plotDropdown.dropdown("setting", "onChange", function(value) {
				module.updatePlotVisibility(value);
				module.updateDescription();
			});
			$plotDropdown = $div.find(".ui.settings.popup").find(".plot-dropdown").find(".fluid.dropdown");
		};

		module.updatePlotVisibility = function(value) {
			plotTypes.forEach(function(type) {
				$div.find(".plot.wrapper").find("." + type).addClass("hidden");
				$div.find(".settings.popup .plot.options").find("." + type).addClass("hidden");
			});
			$div.find(".plot.wrapper").find("." + value).removeClass("hidden");
			$div.find(".settings.popup .plot.options").find("." + value).removeClass("hidden");
		};

		// @brief	populate graph option dropdown based on column data types
		// @return	column indices that are shown in the dropdown
		module.initGraphOptionDropdown = function() {
			var columnOptions = "";
			var availableIx = [];
			var columns = [];
			data.forEach(function(singleData) {
				singleData["attribute"].forEach(function(singleAttr) {
					var type = singleAttr["type"];
					if(type != "others") {
						columns.push(singleAttr["name"]);
					}
				});
			});
			var uniqueColumns = Array.from(new Set(columns));
			uniqueColumns.forEach(function(name) {
				availableIx.push(name);
				var columnType = getType({type: window.getTypeOfColumn(data, name)});
				if(columnType == "numeric" || getType == "discrete") {
					// populate column selection dropdown
					$dropdownX.append(
						$("<option>").val(name).text(name)
					);
				}
				if(columnType != "others") {
					$dropdown1.append(
						$("<option>").val(name).text(name)
					);
				}
			});

			return availableIx;
		};

		// @brief	delete bad data in a numeric data column
		//			add bad data notice in the module
		// @param	columnData	the column data to be trimmed
		// @param	types 		data types of the 2 columns
		// @return	trimmed column data
		module.trimBadData = function(columnDataArray, types) {
			var $missingNotice = $div.find(".missing.notice");

			if(types.indexOf("numeric") == -1 && types.indexOf("discrete") == -1) {
				$missingNotice.addClass("hidden");	
			}

			else {
				$missingNotice.html("<div class='ui " + numberToEnglish(columnDataArray.length) + " column grid'></div>");
				var showing = false;

				columnDataArray = columnDataArray.map((singleData) => (d3.transpose(singleData)));

				columnDataArray.forEach(function(columnData, ix) {
					var noData = false;
					columnData[0].forEach(function(columnDataSample) {
						if(noData) return;
						if(columnDataSample == null) {
							$missingNotice.find(".grid").append(
								"<div class='column'> <i class='warning circle icon'></i> No Data </div>"
							);
							noData = true;
						}
					});
					if(noData) return;

					var originalLength = columnData.length;

					types.forEach(function(type, typeIx) {
						if(type == "numeric" || type == "discrete") {
							columnData = columnData.filter(function(val) {
								return (typeof val[typeIx] === 'number' && !isNaN(val[typeIx]));
							});
						}
					});

					var trimmedLength = columnData.length;

					if(trimmedLength != originalLength) {
						$missingNotice.find(".grid").append(
							"<div class='column'>"
							+ "<i class='warning sign icon'></i> " + (originalLength - trimmedLength) 
								+ " of " + originalLength 
								+ " data points are identified as problematic data and are omitted."
							+ "</div>"
						);
						showing = true;
					}
					else {
						$missingNotice.find(".grid").append(
							"<div class='column'> <i class='info circle icon'></i> No Missing Data </div>"
						);
					}

					columnDataArray[ix] = columnData;
				});

				if(showing) {
					$missingNotice.removeClass("hidden");
				}
				else {
					$missingNotice.addClass("hidden");
				}

				columnDataArray = columnDataArray.map((singleData) => (d3.transpose(singleData)));
			}

			return columnDataArray;
		};

		// @brief	init modules and set module visibility
		module.render = function() {
			var viewpoint = $dropdown1.dropdown("get value")[0];
			var targets = $dropdownX.dropdown("get value").slice(0,-1);

			var columnNames = targets;
			if(viewpoint != "none") columnNames.unshift(viewpoint);

			var indices = data.map(function(singleData) {
				return columnNames.map(function(ixn) {
					return singleData["attribute"].findIndex(function(item) {
						return item["name"] == ixn;
					});
				});
			});
			var columnTypes = targets.map(function(val) { return window.getTypeOfColumn(data, val); });

			var columnData = indices.map(function(indice, ix) {
				return indice.map(function(colIndex) {
					var dataObjToExtract = (colIndex == -1) ? null : data[ix]["data"];
					if(dataObjToExtract == null) return data[ix]["data"].map((_) => (null));
					return dataObjToExtract.map(function(val) {
						return val[data[ix]["attribute"][colIndex]["name"]];
					});
				});
			});
			columnData = module.trimBadData(columnData, columnTypes);
			columnData = columnData.map((singleData) => ((singleData[0] == null) ? null : singleData));

			// obtain modules that needs rendering
			var names = [];
			if(viewpoint == "none") {
				names = ["correlation-plot"]; // "area-plot", 
			}
			else {
				names = ["multiple-line-chart"];
			}

			// initialize necessary modules
			var plotWrapper = $div.find(".plot.wrapper");
			plotWrapper.html("");
			names.forEach(function(name) {
				var moduleName = name.replace(/-/g,"");
				plotWrapper.append($("<div>").addClass(name).html($div.find(".plot.templates").find("." + name).html()));
				var $divToRender = plotWrapper.find("." + name);
				$divToRender["dashboard_compare_" + moduleName](
					columnNames,
					columnData,
					columnTypes
				);
			});

			// toggle show and hide
			plotTypes.forEach(function(type) {
				if(names.indexOf(type) != -1) {
					$plotDropdown.find(".item[data-value='" + type + "']").removeClass("disabled");
				}
				else {
					$plotDropdown.find(".item[data-value='" + type + "']").addClass("disabled");
				}
			});

			// set tab status
			if(names.indexOf($plotDropdown.dropdown("get value")) == -1) {
				$plotDropdown.dropdown("set selected", names[0]);
			}

			module.updatePlotVisibility($plotDropdown.dropdown("get value"));
			module.updateDescription();
		};

		// @brief	reset the module
		module.reset = function() {
			// if init has not been run, do nothing
			if(!$div) return;

			$div.find(".col-dropdown").first().html(""
				+ "<select class='ui fluid dropdown'>"
				+   "<option value='none'>None</option>"
				+ "</select>"
			);

			$div.find(".col-dropdown").last().html(""
				+ "<select multiple='' class='ui fluid dropdown'>"
				+   "<option value=''>Select Targets</option>"
				+ "</select>"
			);
		};

		module.updateDescription = function() {
			$div.find(".header-description").text(module.description());
		};

		module.description = function() {
			var activeType = $plotDropdown.dropdown("get text");
			var activeNames = $dropdownX.dropdown("get value").slice(0,-1);
			var activeNamesLength = activeNames.length;
			var firstActiveName = activeNames[0];

			var groupingSuffix = "";
			if(activeType == "Multiple Line Chart") {
				groupingSuffix = " grouped by " + $dropdown1.dropdown("get value")[0];
			}
			else {
				groupingSuffix = "";
			}

			if(activeNamesLength >= 3) {
				return activeType + " of " + firstActiveName + " and " + (activeNamesLength-1) + " Other Columns" + groupingSuffix;
			}
			else {
				return activeType + " of " 
					+ activeNames.join(" and ")
					+ groupingSuffix
			}
		};

		module.init(renderTo, dataCopy);

	};


	$.fn.dashboard_compare = function () {
		var args = Array.prototype.slice.call(arguments);
        return this.each(function () {
        	if(typeof args[0] == "string") {
        		if($.data($(this), "module-data") !== undefined) {
        			$.data($(this), "module-data")[args[0]].apply(null, args.slice(1));
        		}
        	}
        	else {
        		(new (Function.prototype.bind.apply(Compare, [null, $(this)].concat(args))));
        	}
        });
    };

}(jQuery));