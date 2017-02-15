var instance;

function pipelineUtils() {
     var self = this;
     this.updatePipelines = function(divNames, errorDiv, view, fullscreen, page, component, showChanges, aggregatedChangesGroupingPattern, timeout, pipelineid, jsplumb) {
        Q.ajax({
            url: rootURL + "/" + view.viewUrl + 'api/json' + "?page=" + page + "&component=" + component + "&fullscreen=" + fullscreen,
            dataType: 'json',
            async: true,
            cache: false,
            timeout: 20000,
            success: function (data) {
                self.refreshPipelines(data, divNames, errorDiv, view, fullscreen, showChanges, aggregatedChangesGroupingPattern, pipelineid, jsplumb);
                setTimeout(function () {
                    self.updatePipelines(divNames, errorDiv, view, fullscreen, page, component, showChanges, aggregatedChangesGroupingPattern, timeout, pipelineid, jsplumb);
                }, timeout);
            },
            error: function (xhr, status, error) {
                Q("#" + errorDiv).html('Error communicating to server! ' + htmlEncode(error)).show();
                jsplumb.repaintEverything();
                setTimeout(function () {
                    self.updatePipelines(divNames, errorDiv, view, fullscreen, page, component, showChanges, aggregatedChangesGroupingPattern, timeout, pipelineid, jsplumb);
                }, timeout);
            }
        });
    }

    var lastResponse = null;

    this.refreshPipelines = function(data, divNames, errorDiv, view, showAvatars, showChanges, aggregatedChangesGroupingPattern, pipelineid, jsplumb) {
                           var lastUpdate = data.lastUpdated,
                               cErrorDiv = Q("#" + errorDiv),
                               pipeline,
                               component,
                               html,
                               trigger,
                               triggered,
                               contributors,
                               tasks = [];

                           if (data.error) {
                               cErrorDiv.html('Error: ' + data.error).show();
                           } else {
                               cErrorDiv.hide().html('');
                           }

                           if (lastResponse === null || JSON.stringify(data.pipelines) !== JSON.stringify(lastResponse.pipelines)) {

                               for (var z = 0; z < divNames.length; z++) {
                                   Q("#" + divNames[z]).html('');
                               }

                               if (!data.pipelines || data.pipelines.length === 0) {
                                   Q("#pipeline-message-" + pipelineid).html('No pipelines configured or found. Please review the <a href="configure">configuration</a>')
                               }

                               jsplumb.reset();
                               instance = jsplumb;

                               for (var c = 0; c < data.pipelines.length; c++) {
                                   html = [];
                                   component = data.pipelines[c];
                                   html.push("<section class='pipeline-component'>");
                                   html.push("<h1>" + htmlEncode(component.name));
                                   if (data.allowPipelineStart) {
                                       if (component.firstJobParameterized) {
                                           html.push('&nbsp;<a id=\'startpipeline-' + c  +'\' class="task-icon-link" href="#" onclick="triggerParameterizedBuild(\'' + component.firstJobUrl + '\', \'' + data.name + '\');">');
                                       } else {
                                           html.push('&nbsp;<a id=\'startpipeline-' + c  +'\' class="task-icon-link" href="#" onclick="triggerBuild(\'' + component.firstJobUrl + '\', \'' + data.name + '\');">');
                                       }
                                       html.push('<img class="icon-clock icon-md" title="Build now" src="' + resURL + '/images/24x24/clock.png">');
                                       html.push("</a>");
                                   }
                                   html.push("</h1>");
                                   if (!showAvatars) {
                                       html.push("<div class='pagination'>");
                                       html.push(component.pagingData);
                                       html.push("</div>");
                                   }
                                   if (component.pipelines.length === 0) {
                                       html.push("No builds done yet.");
                                   }

                                   for (var i = 0; i < component.pipelines.length; i++) {
                                       pipeline = component.pipelines[i];

                                       try {
                                          var displayBuildId = "displayBuild" + pipeline.version.substring(1);
                                          var toggleBuildId = "toggleBuild" + pipeline.version.substring(1);
                                          var jobName = component.firstJobUrl.substring(4, component.firstJobUrl.length - 1);
                                          var dataString = jobName + " " + pipeline.version;
                                          var statusString = pipeline.stages[0].tasks[0].status.type;
                                          html.push('<br><a id="' + displayBuildId + '" class="build_header build_' + statusString + '" href="javascript:toggle(' + '\'' + displayBuildId + '\', \'' + toggleBuildId + '\'); redrawConnections();">' + dataString + " " + pipeline.stages[0].tasks[0].status.type + '</a> ');
                                       }
                                       catch(err) {
                                          html.push('<br><a id="' + displayBuildId + '" href="javascript:toggle(' + '\'' + displayBuildId + '\', \'' + toggleBuildId + '\'); redrawConnections();">Collapse</a> ' + dataString);
                                       }
                                       html.push('<div id="' + toggleBuildId + '" style="display: block">');

                                       if (pipeline.triggeredBy && pipeline.triggeredBy.length > 0) {
                                           triggered = "";
                                           for (var y = 0; y < pipeline.triggeredBy.length; y++) {
                                               trigger = pipeline.triggeredBy[y];
                                               triggered = triggered + ' <span class="' + trigger.type + '">' + htmlEncode(trigger.description) + '</span>';
                                               if (y < pipeline.triggeredBy.length - 1) {
                                                   triggered = triggered + ", ";
                                               }
                                           }
                                       }

                                       contributors = [];
                                       if (pipeline.contributors) {
                                           Q.each(pipeline.contributors, function (index, contributor) {
                                               contributors.push(htmlEncode(contributor.name));
                                           });
                                       }

                                       if (contributors.length > 0) {
                                           triggered = triggered + " changes by " + contributors.join(", ");
                                       }

                                       if (pipeline.aggregated) {
                                           if (component.pipelines.length > 1) {
                                               html.push('<h3>Aggregated view</h3>');
                                           }
                                       } else {
                                           if (data.useFullLocaleTimeStrings) {
                                               html.push('<h3>Started on: ' + formatLongDate(pipeline.timestamp) + '</h3>');
                                               html.push('<h3>Triggered by: ' + triggered + '</h3>');
                                           }
                                           else {
                                              html.push('<h3>' + htmlEncode(pipeline.version));
                                               if (triggered != "") {
                                                   html.push(" triggered by " + triggered);
                                               }
                                               html.push(' - Started <span id="' + pipeline.id + '\">' + formatDate(pipeline.timestamp, lastUpdate) + '</span></h3>');
                                           }

                                           if (data.showTotalBuildTime) {
                                               html.push('<h3>Total build time: ' + formatDuration(pipeline.totalBuildTime) + '</h3>');
                                           }

                                           if (data.showCL) {
                                               var jobName = component.firstJobUrl.substring(4, component.firstJobUrl.length - 1);
                                               var buildNum = pipeline.version.substring(1);

                                               if (data.changelistType == "Promotion") {
                                                   html.push('<h3>Changelist: ' + getPromoCL(jobName, buildNum) + '</h3>'); 
                                               }
                                               else if (data.changelistType == "Codedeploy") {
                                                   html.push('<h3>Changelist: ' + getCodeDeployCL(jobName, buildNum) + '</h3>');
                                               }                                               
                                           }

                                           if (data.showArtifacts) {
                                               var jobName = component.firstJobUrl.substring(4, component.firstJobUrl.length - 1);
                                               var buildNum = pipeline.version.substring(1);
                                               html.push('<h3>Artifacts: ' + getBuildArtifactLinks(jobName, buildNum) + '</h3>');
                                           }

                                           html.push('<h3><br></h3>');

                                           if (showChanges && pipeline.changes && pipeline.changes.length > 0) {
                                               html.push(generateChangeLog(pipeline.changes));
                                           }
                                       }

                                       html.push('<section class="pipeline">');

                                       var row = 0, column = 0, stage;

                                       html.push('<div class="pipeline-row">');

                                       for (var j = 0; j < pipeline.stages.length; j++) {
                                           stage = pipeline.stages[j];

                                           if (stage.row > row) {
                                               html.push('</div><div class="pipeline-row">');
                                               column = 0;
                                               row++;
                                           }

                                           if (stage.column > column) {
                                               for (var as = column; as < stage.column; as++) {
                                                   if (data.viewMode == "Minimalist") {
                                                       html.push('<div class="pipeline-cell"><div class="stage-minimalist hide"></div></div>');
                                                   } else {
                                                       html.push('<div class="pipeline-cell"><div class="stage hide"></div></div>');
                                                   }
                                                   column++;
                                               }
                                           }

                                           html.push('<div class="pipeline-cell">');

                                           if (data.viewMode == "Minimalist") {
                                               html.push('<div id="' + getStageId(stage.id + "", i) + '" class="stage stage-minimalist ' + getStageClassName(stage.name) + '">');
                                               html.push('<div class="stage-minimalist-header"><div class="stage-minimalist-name small_SUCCESS">' + htmlEncode("#" + stage.tasks[0].buildId) + '</div>'); // + htmlEncode(stage.name) + '</div>');
                                           } else {
                                               html.push('<div id="' + getStageId(stage.id + "", i) + '" class="stage ' + getStageClassName(stage.name) + '">');
                                               html.push('<div class="stage-header"><div class="stage-name build_SUCCESS">' + htmlEncode(stage.name) + '</div>');
                                           }

                                           if (!pipeline.aggregated) {
                                               html.push('</div>');
                                           } else {
                                               var stageversion = stage.version;
                                               if (!stageversion) {
                                                   stageversion = "N/A"
                                               }
                                               html.push(' <div class="stage-version">' + htmlEncode(stageversion) + '</div></div>');
                                           }

                                           var task, id, timestamp, progress, progressClass, consoleLogLink = "";

                                           for (var k = 0; k < stage.tasks.length; k++) {
                                               task = stage.tasks[k];

                                               id = getTaskId(task.id, i);

                                               if (data.useFullLocaleTimeStrings) {
                                                 timestamp = formatCardLongDate(task.status.timestamp);
                                               } else {
                                                 timestamp = formatDate(task.status.timestamp, lastUpdate); 
                                               }
                                               
                                               tasks.push({id: id, taskId: task.id, buildId: task.buildId});

                                               progress = 100;
                                               progressClass = "task-progress-notrunning";

                                               if (task.status.percentage) {
                                                   progress = task.status.percentage;
                                                   progressClass = "task-progress-running";
                                               } else if (data.linkToConsoleLog) {
                                                  if (task.status.success ||
                                                      task.status.failed ||
                                                      task.status.unstable ||
                                                      task.status.cancelled) {
                                                      consoleLogLink = "console";
                                                  }
                                               }

                                               if (data.viewMode == "Minimalist") {
                                                   html.push("<div id=\"" + id + "\" class=\"status stage-minimalist-task " + // task.status.type +
                                                       "\"><div class=\"minimalist-task-progress " + progressClass + "\" style=\"width: " + progress + "%;\"><div class=\"task-content\">" +
                                                       "<div class=\"task-header\"><div class=\"taskname-minimalist\">" + task.name + "</div>");
                                                   html.push("</div></div></div></div>");
                                               } else {
                                                   html.push("<div id=\"" + id + "\" class=\"status stage-task " + task.status.type +
                                                       "\"><div class=\"task-progress " + progressClass + "\" style=\"width: " + progress + "%;\"><div class=\"task-content\">" +
                                                       "<div class=\"task-header\"><div class=\"taskname\"><a href=\"" + getLink(data, task.link) + consoleLogLink + "\">" + htmlEncode("#" + task.buildId + " " + task.name) + "</a></div>");
                                                   if (data.allowManualTriggers && task.manual && task.manualStep.enabled && task.manualStep.permission) {
                                                       html.push('<div class="task-manual" id="manual-' + id + '" title="Trigger manual build" onclick="triggerManual(\'' + id + '\', \'' + task.id + '\', \'' + task.manualStep.upstreamProject + '\', \'' + task.manualStep.upstreamId + '\', \'' + view.viewUrl + '\');">');
                                                       html.push("</div>");
                                                   } else {
                                                       if (!pipeline.aggregated && data.allowRebuild && task.rebuildable) {
                                                           html.push('<div class="task-rebuild" id="rebuild-' + id + '" title="Trigger rebuild" onclick="triggerRebuild(\'' + id + '\', \'' + task.id + '\', \'' + task.buildId + '\', \'' + view.viewUrl + '\');">');
                                                           html.push("</div>");
                                                       }
                                                   }

                                                   html.push('</div><div class="task-details">');

                                                   if (timestamp != "") {
                                                       html.push("<div id=\"" + id + ".timestamp\" class='timestamp'>" + timestamp + "</div>");
                                                   }

                                                   if (task.status.duration >= 0) {
                                                       html.push("<div class='duration'>" + formatDuration(task.status.duration) + "</div>");
                                                   }

                                                   html.push("</div></div></div></div>");

                                                   html.push(generateDescription(data, task));
                                                   html.push(generateTestInfo(data, task));
                                                   html.push(generateStaticAnalysisInfo(data, task));
                                                   html.push(generatePromotionsInfo(data, task));
                                                   }
                                           }

                                           if (pipeline.aggregated && stage.changes && stage.changes.length > 0) {
                                               html.push(generateAggregatedChangelog(stage.changes, aggregatedChangesGroupingPattern));
                                           }

                                           html.push("</div></div>");
                                           column++;
                                       }

                                       html.push('</div>');
                                       html.push("</section>");

                                       html.push('</div>');
                                   }

                                   html.push("</section>");
                                   Q("#" + divNames[c % divNames.length]).append(html.join(""));
                                   Q("#pipeline-message-" + pipelineid).html('');
                               }

                               var index = 0, source, target;
                               lastResponse = data;
                               equalheight(".pipeline-row .stage");

                               Q.each(data.pipelines, function (i, component) {
                                   Q.each(component.pipelines, function (j, pipeline) {
                                       index = j;
                                       Q.each(pipeline.stages, function (k, stage) {
                                           if (stage.downstreamStages) {
                                               Q.each(stage.downstreamStageIds, function (l, value) {
                                                   source = getStageId(stage.id + "", index);
                                                   target = getStageId(value + "", index);
                                                   jsplumb.connect({
                                                       source: source,
                                                       target: target,
                                                       anchors: [[1, 0, 1, 0, 0, 37], [0, 0, -1, 0, 0, 37]], // allow boxes to increase in height but keep anchor lines on the top
                                                       overlays: [
                                                           [ "Arrow", { location: 1, foldback: 0.9, width: 12, length: 12}]
                                                       ],
                                                       cssClass: "relation",
                                                       connector: ["Flowchart", { stub: 25, gap: 2, midpoint: 1, alwaysRespectStubs: true } ],
                                                       paintStyle: { lineWidth: 2, strokeStyle: "rgba(118,118,118,1)" },
                                                       endpoint: ["Blank"]
                                                   });
                                               });
                                           }
                                       });
                                   });
                               });

                           } else {
                               var comp, pipe, head, st, ta, time;

                               for (var p = 0; p < data.pipelines.length; p++) {
                                   comp = data.pipelines[p];
                                   for (var d = 0; d < comp.pipelines.length; d++) {
                                       pipe = comp.pipelines[d];
                                       head = document.getElementById(pipe.id);
                                       if (head) {
                                           head.innerHTML = formatDate(pipe.timestamp, lastUpdate)
                                       }

                                       for (var l = 0; l < pipe.stages.length; l++) {
                                           st = pipe.stages[l];
                                           for (var m = 0; m < st.tasks.length; m++) {
                                               ta = st.tasks[m];
                                               time = document.getElementById(getTaskId(ta.id, d) + ".timestamp");
                                               if (time) {
                                                   time.innerHTML = formatDate(ta.status.timestamp, lastUpdate);
                                               }
                                           }
                                       }
                                   }
                               }
                           }
                        jsplumb.repaintEverything();
                       }
}

function redrawConnections() {
    instance.repaintEverything();
}

function getLink(data, link) {
    if (data.linkRelative) {
        return link;
    } else {
        return rootURL + "/" + link;
    }
}

function generateDescription(data, task) {
    if (data.showDescription && task.description && task.description != "") {
        var html = ["<div class='infoPanelOuter'>"];
        html.push("<div class='infoPanel'><div class='infoPanelInner'>" + task.description.replace(/\r\n/g, '<br/>') + "</div></div>");
        html.push("</div>");
        return html.join("");
    }
}

function generateTestInfo(data, task) {
    if (data.showTestResults && task.testResults && task.testResults.length > 0) {
        var html = ["<div class='infoPanelOuter'>"];
        Q.each(task.testResults, function(i, analysis) {
            html.push("<div class='infoPanel'><div class='infoPanelInner'>");
                html.push("<a href=" + getLink(data,analysis.url) + ">" + analysis.name + "</a>");
                html.push("<table id='priority.summary' class='pane'>");
                html.push("<tbody>");
                    html.push("<tr>");
                        html.push("<td class='pane-header'>Total</td>");
                        html.push("<td class='pane-header'>Failures</td>");
                        html.push("<td class='pane-header'>Skipped</td>");
                    html.push("</tr>");
                html.push("</tbody>");
                html.push("<tbody>");
                    html.push("<tr>");
                        html.push("<td class='pane'>" + analysis.total + "</td>");
                        html.push("<td class='pane'>" + analysis.failed + "</td>");
                        html.push("<td class='pane'>" + analysis.skipped + "</td>");
                    html.push("</tr>");
                html.push("</tbody>");
                html.push("</table>");
            html.push("</div></div>");
        });
        html.push("</div>");
        return html.join("");
    }
}

function generateStaticAnalysisInfo(data, task) {
    if (data.showStaticAnalysisResults && task.staticAnalysisResults && task.staticAnalysisResults.length > 0) {
        var html = ["<div class='infoPanelOuter'>"];
        html.push("<div class='infoPanel'><div class='infoPanelInner'>");
            html.push("<table id='priority.summary' class='pane'>");
            html.push("<thead>");
                html.push("<tr>");
                    html.push("<td class='pane-header'>Warnings</td>");
                    html.push("<td class='pane-header' style='font-size: smaller; vertical-align: bottom;'>High</td>");
                    html.push("<td class='pane-header' style='font-size: smaller; vertical-align: bottom;'>Normal</td>");
                    html.push("<td class='pane-header' style='font-size: smaller; vertical-align: bottom;'>Low</td>");
                html.push("</tr>");
            html.push("</thead>");
            html.push("<tbody>");
            Q.each(task.staticAnalysisResults, function(i, analysis) {
                html.push("<tr>");
                    html.push("<td class='pane'><a href=" + getLink(data,analysis.url) + ">" + trimWarningsFromString(analysis.name) + "</a></td>");
                    html.push("<td class='pane' style='text-align: center;'>" + analysis.high + "</td>");
                    html.push("<td class='pane' style='text-align: center;'>" + analysis.normal + "</td>");
                    html.push("<td class='pane' style='text-align: center;'>" + analysis.low + "</td>");
                html.push("</tr>");
            });
            html.push("</tbody>");
            html.push("</table>");
        html.push("</div></div>");
        html.push("</div>");
        return html.join("");
    }
}

function trimWarningsFromString(label) {
    var offset = label.indexOf("Warnings");
    if (offset == -1) {
        return label;
    } else {
        return label.substring(0, offset).trim()
    }
}

function generatePromotionsInfo(data, task) {
    if (data.showPromotions && task.status.promoted && task.status.promotions && task.status.promotions.length > 0) {
        var html = ["<div class='infoPanelOuter'>"];
        Q.each(task.status.promotions, function(i, promo) {
            html.push("<div class='infoPanel'><div class='infoPanelInner'><div class='promo-layer'>");
            html.push("<img class='promo-icon' height='16' width='16' src='" + rootURL + promo.icon + "'/>");
            html.push("<span class='promo-name'><a href='" + getLink(data,task.link) + "promotion'>" + htmlEncode(promo.name) + "</a></span><br/>");
            if (promo.user != 'anonymous') {
                html.push("<span class='promo-user'>" + promo.user + "</span>");
            }
            html.push("<span class='promo-time'>" + formatDuration(promo.time) + "</span><br/>");
            if (promo.params.length > 0) {
                html.push("<br/>");
            }
            Q.each(promo.params, function (j, param) {
                html.push(param.replace(/\r\n/g, '<br/>') + "<br />");
            });
            html.push("</div></div></div>");
        });
        html.push("</div>");
        return html.join("");
    }
}

function generateChangeLog(changes) {
    var html = ['<div class="changes">'];
    html.push('<h1>Changes:</h1>');
    for (var i = 0; i < changes.length; i++) {
        html.push('<div class="change">');
        var change = changes[i];

        if (change.changeLink) {
            html.push('<a href="' + change.changeLink + '">');
        }

        html.push('<div class="change-commit-id">' + htmlEncode(change.commitId) + '</div>');

        if (change.changeLink) {
            html.push('</a>');
        }

        html.push('<div class="change-author">' + htmlEncode(change.author.name) + '</div>');

        html.push('<div class="change-message">' + change.message + '</div>');
        html.push('</div>');
    }
    html.push('</div>');
    return html.join("");
}

function generateAggregatedChangelog(stageChanges, aggregatedChangesGroupingPattern) {
    var html = [];
    html.push("<div class='aggregatedChangesPanelOuter'>");
    html.push("<div class='aggregatedChangesPanel'>");
    html.push("<div class='aggregatedChangesPanelInner'>");
    html.push("<b>Changes:</b>");
    html.push("<ul>");

    var changes = {};

    var unmatchedChangesKey = '';

    if (aggregatedChangesGroupingPattern) {
        var re = new RegExp(aggregatedChangesGroupingPattern);

        stageChanges.forEach(function(stageChange) {
            var matches = stageChange.message.match(re) || [unmatchedChangesKey];

            Q.unique(matches).forEach(function (match) {
                (changes[match] || (changes[match] = [])).push(stageChange);
            });
        });
    } else {
        changes[unmatchedChangesKey] = stageChanges;
    }

    var keys = Object.keys(changes).sort().filter(function(matchKey) {
        return matchKey !== unmatchedChangesKey;
    });

    keys.push(unmatchedChangesKey);

    keys.forEach(function(matchKey) {
        if (matchKey != unmatchedChangesKey) {
            html.push("<li class='aggregatedKey'><b>" + matchKey + "</b><ul>");
        }

        (changes[matchKey] || []).forEach(function (change) {
            html.push("<li>");
            html.push(change.message || "&nbsp;");
            html.push("</li>");
        });

        if (matchKey != unmatchedChangesKey) {
            html.push("</ul></li>");
        }
    });

    html.push("</ul>");
    html.push("</div>");
    html.push("</div>");
    html.push("</div>");

    return html.join("")
}

function getStageClassName(stagename) {
    return "stage_" + replace(stagename, " ", "_");
}

function getTaskId(taskname, count) {
    return "task-" + replace(replace(taskname, " ", "_"), "/", "_") + count;
}

function replace(string, replace, replaceWith) {
    var re = new RegExp(replace, 'g');
    return string.replace(re, replaceWith);
}


function formatDate(date, currentTime) {
    if (date != null) {
        return moment(date, "YYYY-MM-DDTHH:mm:ss").from(moment(currentTime, "YYYY-MM-DDTHH:mm:ss"))
    } else {
        return "";
    }
}

/**
 * Full credit for the 2 Date methods below to the author of the following article:
 * http://javascript.about.com/library/bldst.htm
 */
Date.prototype.stdTimezoneOffset = function() {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.dst = function() {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

/**
 * For the 4 primary US timezones
 */
function getUSTimezone(timezone) {
    var timezones = '{}';
    var today = new Date();

    // Account for daylight savings time
    if (today.dst()) {
        timezones = JSON.parse('{"GMT-0700": "PDT", "GMT-0600": "MDT", "GMT-0500": "CDT","GMT-0400": "EDT"}');
    }
    else {
        timezones = JSON.parse('{"GMT-0800": "PST", "GMT-0700": "MST", "GMT-0600": "CST","GMT-0500": "EST"}');
    }

    // For other parts in the world
    if (timezones.hasOwnProperty(timezone) != true) {
        return timezone;
    }

    return timezones[timezone];
}

function formatLongDate(date) {
  if (date != null) {
    // No moment method to get the timezone so we'll do it ourselves
    var dateString = moment(date, "YYYY-MM-DDTHH:mm:ss").toString();
    var timezoneString = getUSTimezone(dateString.split(' ')[5]);
    dateString = moment(date, "YYYY-MM-DDTHH:mm:ss").toString().split(' ').slice(0, 5).join(' ') + " " + timezoneString;
    return dateString;
  }
  return "";
}

function formatCardLongDate(date) {
  if (date != null) {
    return moment(date, "YYYY-MM-DDTHH:mm:ss").toString().split(' ').slice(1, 5).join(' ');
  }
  return "";
}

function formatDuration(millis) {
    if (millis > 0) {
        var seconds = Math.floor(millis / 1000),
            minutes = Math.floor(seconds / 60),
            minstr,
            secstr;

        seconds = seconds % 60;

        if (minutes === 0){
            minstr = "";
        } else {
            minstr = minutes + " min ";
        }

        secstr = "" + seconds + " sec";

        return minstr + secstr;
    }
    return "0 sec";
}

function triggerManual(taskId, downstreamProject, upstreamProject, upstreamBuild, viewUrl) {
    Q("#manual-" + taskId).hide();
    var formData = {project: downstreamProject, upstream: upstreamProject, buildId: upstreamBuild},
        before;

    if (crumb.value !== null && crumb.value !== "") {
        console.info("Crumb found and will be added to request header");
        before = function(xhr){xhr.setRequestHeader(crumb.fieldName, crumb.value);}
    } else {
        console.info("Crumb not needed");
        before = function(xhr){}
    }

    Q.ajax({
        url: rootURL + "/" + viewUrl + 'api/manualStep',
        type: "POST",
        data: formData,
        beforeSend: before,
        timeout: 20000,
        async: true,
        success: function (data, textStatus, jqXHR) {
            console.info("Triggered build of " + downstreamProject + " successfully!");
        },
        error: function (jqXHR, textStatus, errorThrown) {
            window.alert("Could not trigger build! error: " + errorThrown + " status: " + textStatus);
        }
    });
}

function triggerRebuild(taskId, project, buildId, viewUrl) {
    Q("#rebuild-" + taskId).hide();
    var formData = {project: project, buildId: buildId};

    var before;
    if (crumb.value != null && crumb.value != "") {
        console.info("Crumb found and will be added to request header");
        before = function(xhr){xhr.setRequestHeader(crumb.fieldName, crumb.value);}
    } else {
        console.info("Crumb not needed");
        before = function(xhr){}
    }

    Q.ajax({
        url: rootURL + "/" + viewUrl + 'api/rebuildStep',
        type: "POST",
        data: formData,
        beforeSend: before,
        timeout: 20000,
        success: function (data, textStatus, jqXHR) {
            console.info("Triggered rebuild of " + project + " successfully!")
        },
        error: function (jqXHR, textStatus, errorThrown) {
            window.alert("Could not trigger rebuild! error: " + errorThrown + " status: " + textStatus)
        }
    });
}

function triggerParameterizedBuild(url, taskId) {
    console.info("Job is parameterized");
    window.location.href = rootURL + "/" + url + 'build?delay=0sec';
}

function triggerBuild(url, taskId) {
    var before;
    if (crumb.value != null && crumb.value != "") {
        console.info("Crumb found and will be added to request header");
        before = function(xhr){xhr.setRequestHeader(crumb.fieldName, crumb.value);}
    } else {
        console.info("Crumb not needed");
        before = function(xhr){}
    }

    Q.ajax({
        url: rootURL + "/" + url + 'build?delay=0sec',
        type: "POST",
        beforeSend: before,
        timeout: 20000,
        success: function (data, textStatus, jqXHR) {
            console.info("Triggered build of " + taskId + " successfully!")
        },
        error: function (jqXHR, textStatus, errorThrown) {
            window.alert("Could not trigger build! error: " + errorThrown + " status: " + textStatus)
        }
    });
}

function htmlEncode(html) {
    return document.createElement('a')
        .appendChild(document.createTextNode(html))
        .parentNode.innerHTML
        .replace(/\n/g, '<br/>');
}

function getStageId(name, count) {
    var re = new RegExp(' ', 'g');
    return name.replace(re, '_') + "_" + count;
}

function equalheight(container) {

    var currentTallest = 0,
        currentRowStart = 0,
        rowDivs = new Array(),
        $el,
        topPosition = 0;

    Q(container).each(function () {

        $el = Q(this);
        Q($el).height('auto');
        topPosition = $el.position().top;

        if (currentRowStart != topPosition) {
            rowDivs.length = 0; // empty the array
            currentRowStart = topPosition;
            currentTallest = $el.height() + 2;
            rowDivs.push($el);
        } else {
            rowDivs.push($el);
            currentTallest = (currentTallest < $el.height() + 2) ? ($el.height() + 2) : (currentTallest);
        }
        for (currentDiv = 0; currentDiv < rowDivs.length; currentDiv++) {
            rowDivs[currentDiv].height(currentTallest);
        }
    });
}

/**
 * Get the CL for a promotion job.
 * Should be safe to cache the results as they are static
 * TODO: Make this asynchronous -- A(synchronous)JAX for a reason
 */
function getPromoCL(taskId, buildNum) {

    // Check that a CL exists first before attempting to find CL.txt so we aren't
    // submitting GET requests only to receive a 404 error
    var artifacts = getBuildArtifacts(taskId, buildNum);
    var CL = "No CL found";

    for(var i=0; i<artifacts.length; i++) {
        if (artifacts[i] == 'CL.txt') {
            Q.ajax({
                url: "http://localhost:8080/job/" + taskId + "/" + buildNum + "/artifact/CL.txt",
                type: "GET",
                dataType: 'json',
                async: false,
                cache: true,
                timeout: 20000,
                success: function (data) {
                    CL = data;
                },
                error: function (xhr, status, error) {
                }
            })
            // Don't expect too many artifacts but save time where we can
            break;
        }
    }
    return CL;
}

/**
 * Get the CL for a production job.
 * Should be safe to cache the results as they are static
 * TODO: Make this asynchronous -- A(synchronous)JAX for a reason
 */
function getCodeDeployCL(taskId, buildNum) {
    var CL = "No CL found";
    Q.ajax({
        url: "http://localhost:8080/job/" + taskId + "/" + buildNum + "/api/json?tree=actions[parameters[*]]",
        type: "GET",
        dataType: 'json',
        async: false,
        cache: true,
        timeout: 20000,
        success: function (json) {
            CL = extractCLFromJson(json);
        },
        error: function (xhr, status, error) {
        }
    })
    return CL;
}

/**
 * Helper method to extract the CODEDEPLOY_CL from json
 */
function extractCLFromJson(json) {
    var actions = json.actions;
    var params = {};

    if (actions.length > 0) {
        for(var i=0; i<actions.length; i++) {
            if ("parameters" in actions[i]) {
                params = actions[i].parameters;

                for(var j=0; j<params.length; j++) {
                    param = params[j];
                    if (param.name == "CODEDEPLOY_CL") {
                        return param.value;
                    }  
                }
            }
        }
    }
    return "No CL found";
}

/**
 * TESTING PURPOSES ONLY
 */
function testParse() {
    var CL = "";
    var json = {"actions":[{},{},{"parameters":[{"name":"TEST","value":false},{"name":"CODEDEPLOY_CL","value":"0123456789"}]},{}]};

    CL = extractCLFromJson(json);
    console.info(CL);
}

/**
 * Get all artifacts for a build.
 * Should be safe to cache the results as they are static
 * TODO: Make this asynchronous -- A(synchronous)JAX for a reason
 */
function getBuildArtifacts(taskId, buildNum) {
    var artifacts = [];
    Q.ajax({
        url: "http://localhost:8080/job/" + taskId + "/" + buildNum + "/api/json?tree=artifacts[*]",
        type: "GET",
        dataType: 'json',
        async: false,
        cache: true,
        timeout: 20000,
        success: function (json) {
            var data = json.artifacts;
            if (data.length > 0) {
                for (var i=0; i<data.length; i++) {
                    artifacts.push(data[i].fileName);
                }
            }
        },
        error: function (xhr, status, error) {
        }
    })
    return artifacts;
}

function getBuildArtifactLinks(taskId, buildNum) {
    var artifacts = getBuildArtifacts(taskId, buildNum);

    if (artifacts.length == 0) {
      return "No artifacts found";
    }

    var retVal = "";

    if (artifacts.length > 0) {
        for (var i=0; i<artifacts.length; i++) {
            retVal += "<a href=\"http://localhost:8080/job/" + taskId + "/" + buildNum + "/artifact/" + artifacts[i] + "\">" + htmlEncode(artifacts[i]) + "</a>, "
        }
        retVal = retVal.substring(0, retVal.length - 2);
    }

    return retVal;
}

function toggle(displayBuildId, toggleBuildId) {
    var ele = document.getElementById(toggleBuildId);
    var text = document.getElementById(displayBuildId);

    if (ele.style.display == "block") {
        ele.style.display = "none";
        // text.innerHTML = "> " + displayBuildId;
    }
    else {
        ele.style.display = "block";
        // text.innerHTML = "v " + displayBuildId;
    }
}
