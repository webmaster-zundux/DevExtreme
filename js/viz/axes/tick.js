var isDefined = require("../../core/utils/type").isDefined,
    extend = require("../../core/utils/extend").extend;

function getPathStyle(options) {
    return { stroke: options.color, "stroke-width": options.width, "stroke-opacity": options.opacity, opacity: 1 };
}

function createTick(axis, renderer, tickOptions, gridOptions, skippedCategory, skipLabels, offset) {
    var tickOffset = offset || axis._tickOffset,
        lineGroup = axis._axisLineGroup,
        elementsGroup = axis._axisElementsGroup,
        tickStyle = getPathStyle(tickOptions),
        gridStyle = getPathStyle(gridOptions),
        emptyStrRegExp = /^\s+$/,

        axisOptions = axis.getOptions(),
        labelOptions = axisOptions.label,
        labelStyle = axis._textOptions;

    function getLabelFontStyle(tick) {
        var fontStyle = axis._textFontStyles,
            customizeColor = labelOptions.customizeColor;

        if(customizeColor && customizeColor.call) {
            fontStyle = extend({}, axis._textFontStyles, { fill: customizeColor.call(tick, tick) });
        }

        return fontStyle;
    }

    return function(value) {
        var tick = {
            value: value,

            updateValue(newValue) {
                this.value = value = newValue;
            },

            initCoords: function() {
                this.coords = axis._getTranslatedValue(value, tickOffset);
                this.labelCoords = axis._getTranslatedValue(value);
            },
            saveCoords() {
                this._storedCoords = this.coords;
                this._storedLabelsCoords = this.labelCoords;
            },
            drawMark: function() {
                if(!tickOptions.visible || skippedCategory === value) {
                    return;
                }

                if(axis.areCoordsOutsideAxis(this.coords)) {
                    return;
                }

                if(this.mark) {
                    this.mark.append(lineGroup);
                    this.updateTickPosition();
                } else {
                    this.mark = axis._createPathElement([], tickStyle).append(lineGroup);
                    this.updateTickPosition();
                }
            },

            setSkippedCategory(category) {
                skippedCategory = category;
            },

            _updateLine(lineElement, settings, storedSettings, animate) {
                if(!lineElement) {
                    return;
                }
                if(settings.points === null) {
                    lineElement.remove();
                    return;
                }
                if(animate && storedSettings && storedSettings.points !== null) {
                    settings.opacity = 1;
                    lineElement.attr(storedSettings);
                    lineElement.animate(settings);
                } else {
                    settings.opacity = animate ? 0 : 1;

                    lineElement.attr(settings);

                    animate && lineElement.animate({
                        opacity: 1
                    }, {
                        delay: 0.5,
                        partitionDuration: 0.5
                    });
                }

                this.coords.angle && axis._rotateTick(lineElement, this.coords);
            },

            updateTickPosition: function(animate) {
                this._updateLine(this.mark, {
                    points: axis._getTickMarkPoints(tick.coords, tickOptions.length)
                },
                this._storedCoords && {
                    points: axis._getTickMarkPoints(tick._storedCoords, tickOptions.length)
                },
                animate);
            },
            drawLabel: function(range) {
                const stubData = axis.getTranslator().getBusinessRange().stubData;
                const labelIsVisible = labelOptions.visible && !skipLabels && !stubData && !axis.areCoordsOutsideAxis(this.labelCoords);

                if(!labelIsVisible) {
                    if(this.label) {
                        this.label.remove();
                    }
                    return;
                }

                const text = axis.formatLabel(value, labelOptions, range);

                if(this.label) {
                    this.label.attr({ text, rotate: 0 }).append(elementsGroup);
                    this.updateLabelPosition();
                    return;
                }

                if(isDefined(text) && text !== "" && !emptyStrRegExp.test(text)) {
                    this.label = renderer
                        .text(text)
                        .css(getLabelFontStyle(this))
                        .attr(labelStyle)

                        .data("chart-data-argument", this.value)
                        .append(elementsGroup);

                    this.updateLabelPosition();

                    const labelHint = axis.formatHint(this.value, labelOptions, range);
                    if(isDefined(labelHint) && labelHint !== "") {
                        this.label.setTitle(labelHint);
                    }
                }
            },

            fadeOutElements() {
                const startSettings = { opacity: 1 };
                const endSettings = { opacity: 0 };
                const animationSettings = {
                    partitionDuration: 0.5
                };

                if(this.label) {
                    this._fadeOutLabel();
                }
                if(this.grid) {
                    this.grid.append(axis._axisGridGroup).attr(startSettings).animate(endSettings, animationSettings);
                }
                if(this.mark) {
                    this.mark.append(axis._axisLineGroup).attr(startSettings).animate(endSettings, animationSettings);
                }
            },

            _fadeInLabel() {
                const group = axis._renderer.g().attr({
                    opacity: 0
                }).append(axis._axisElementsGroup)
                    .animate({ opacity: 1 }, {
                        delay: 0.5,
                        partitionDuration: 0.5
                    });

                this.label.append(group);
            },

            _fadeOutLabel() {
                const group = axis._renderer.g().attr({
                    opacity: 1
                }).animate({ opacity: 0 }, {
                    partitionDuration: 0.5
                }).append(axis._axisElementsGroup);
                this.label.append(group);
            },

            updateLabelPosition: function(animate) {
                if(!this.label) {
                    return;
                }

                if(animate && this._storedLabelsCoords) {
                    this.label.attr({
                        x: this._storedLabelsCoords.x,
                        y: this._storedLabelsCoords.y
                    });

                    this.label.animate({
                        x: this.labelCoords.x,
                        y: this.labelCoords.y
                    });

                } else {
                    this.label.attr({
                        x: this.labelCoords.x,
                        y: this.labelCoords.y
                    });

                    if(animate) {
                        this._fadeInLabel();
                    }
                }
            },

            drawGrid: function(drawLine) {
                if(gridOptions.visible && skippedCategory !== this.value) {
                    if(this.grid) {
                        this.grid.append(axis._axisGridGroup);
                        this.updateGridPosition();
                    } else {
                        this.grid = drawLine(this, gridStyle);
                        this.grid && this.grid.append(axis._axisGridGroup);
                    }
                }
            },

            updateGridPosition: function(animate) {
                this._updateLine(this.grid,
                    axis._getGridPoints(tick.coords),
                    this._storedCoords && axis._getGridPoints(this._storedCoords),
                    animate);
            },

            removeLabel() {
                this.label.remove();
                this.label = null;
            }
        };

        return tick;
    };
}

exports.tick = createTick;
