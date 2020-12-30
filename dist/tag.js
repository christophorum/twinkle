var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a = Twinkle.shims, obj_entries = _a.obj_entries, obj_values = _a.obj_values, arr_includes = _a.arr_includes;
var Tag = /** @class */ (function (_super) {
    __extends(Tag, _super);
    function Tag() {
        var _this = _super.call(this) || this;
        _this.makeWindow = function () {
            var Window = new Morebits.simpleWindow(630, 500);
            Window.setScriptName('Twinkle');
            // anyone got a good policy/guideline/info page/instructional page link??
            Window.addFooterLink('Twinkle help', 'WP:TW/DOC#tag');
            _this.mode.makeForm(Window);
            _this.mode.formRender();
            _this.mode.postRender();
        };
        for (var _i = 0, _a = Tag.modeList; _i < _a.length; _i++) {
            var mode = _a[_i];
            if (mode.isActive()) {
                // @ts-ignore
                _this.mode = new mode();
                break;
            }
        }
        if (!_this.mode) { // no mode is active
            return _this;
        }
        _this.portletName = 'Tag';
        _this.portletId = 'friendly-tag';
        _this.portletTooltip = _this.mode.getMenuTooltip();
        _this.addMenu();
        return _this;
    }
    /**
     * Adds a link to each template's description page
     * @param {Morebits.quickForm.element} checkbox  associated with the template
     */
    Tag.makeArrowLinks = function (checkbox) {
        var link = Morebits.htmlNode('a', '>');
        link.setAttribute('class', 'tag-template-link');
        var tagname = checkbox.values;
        link.setAttribute('href', mw.util.getUrl((tagname.indexOf(':') === -1 ? 'Template:' : '') +
            (tagname.indexOf('|') === -1 ? tagname : tagname.slice(0, tagname.indexOf('|')))));
        link.setAttribute('target', '_blank');
        $(checkbox).parent().append(['\u00A0', link]);
    };
    Tag.makeEditSummary = function (addedTags, removedTags, reason) {
        var makeTemplateLink = function (tag) {
            var text = '{{[[';
            // if it is a custom tag with a parameter
            if (tag.indexOf('|') !== -1) {
                tag = tag.slice(0, tag.indexOf('|'));
            }
            text += tag.indexOf(':') !== -1 ? tag : 'Template:' + tag + '|' + tag;
            return text + ']]}}';
        };
        var summaryText;
        if (addedTags.length) {
            summaryText = 'Added ' + mw.language.listToText(addedTags.map(makeTemplateLink));
            summaryText += (removedTags === null || removedTags === void 0 ? void 0 : removedTags.length) ? '; and removed ' +
                mw.language.listToText(removedTags.map(makeTemplateLink)) : '';
        }
        else if (removedTags === null || removedTags === void 0 ? void 0 : removedTags.length) {
            summaryText = 'Removed ' + mw.language.listToText(removedTags.map(makeTemplateLink));
        }
        summaryText += ' tag' + (addedTags.length + (removedTags === null || removedTags === void 0 ? void 0 : removedTags.length) > 1 ? 's' : '');
        if (reason) {
            summaryText += ': ' + reason;
        }
        // avoid long summaries
        if (summaryText.length > 499) {
            summaryText = summaryText.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1');
        }
        return summaryText;
    };
    return Tag;
}(TwinkleModule));
var TagMode = /** @class */ (function () {
    function TagMode() {
        this.existingTags = [];
        this.removalSupported = false; // Override to true for modes that support untagging
        /**
         * Grouping
         *
         * A group template is a template container that takes the form
         *
         * {{group template name|
         * {{tag template 1}}
         * {{tag template 2}}
         * }}
         *
         * Any other kind of "grouping" is not supported.
         *
         * If groupTemplateName is null, grouping is always disabled for the mode.
         *
         * Individual tags can be excluded from grouping by setting excludeInGroup=true
         * for that template in tag data configuration.
         *
         * Grouping can also be disabled depending on user input or other factors by
         * setting this.params.disableGrouping = true in the preprocessParams() hook.
         *
         */
        /**
         * Name of grouping template.
         * Default: null, which indicates no grouping template for the mode.
         */
        this.groupTemplateName = null;
        /**
         * Minimum number of tags that a group should contain
         */
        this.groupMinSize = 1;
        /**
         * Should tags that are not present in tag configuration be considered
         * groupable? This includes custom tags set in user-level preferences,
         * and tags found existing on the page which are absent in the config.
         */
        this.assumeUnknownTagsGroupable = true;
    }
    TagMode.isActive = function () {
        return false;
    };
    /**
     * Removal of tags is possible only if this returns true:
     * when the user is viewing the article in read mode or a permalink
     * of the latest version.
     */
    TagMode.prototype.canRemove = function () {
        return this.removalSupported &&
            // Only on latest version of pages
            (mw.config.get('wgCurRevisionId') === mw.config.get('wgRevisionId')) &&
            // Disabled on latest diff because the diff slider could be used to slide
            // away from the latest diff without causing the script to reload
            !mw.config.get('wgDiffNewId');
    };
    TagMode.prototype.getMenuTooltip = function () {
        return 'Add maintenance tags to the page';
    };
    TagMode.prototype.getWindowTitle = function () {
        return 'Add maintenance tags';
    };
    TagMode.prototype.makeForm = function (Window) {
        var _this = this;
        this.Window = Window;
        this.Window.setTitle(this.getWindowTitle());
        this.form = new Morebits.quickForm(function () { return _this.evaluate(); });
        this.constructFlatObject();
        this.form.append({
            type: 'input',
            label: 'Filter tag list: ',
            name: 'quickfilter',
            size: '30px',
            event: QuickFilter.onInputChange
        });
        if (this.removalSupported && !this.canRemove()) {
            this.form.append({
                type: 'div',
                name: 'untagnotice',
                label: Morebits.htmlNode('div', 'For removal of existing tags, please open Tag menu from the current version of article')
            });
        }
        this.scrollbox = this.form.append({
            type: 'div',
            id: 'tagWorkArea',
            className: 'morebits-scrollbox',
            style: 'max-height: 28em'
        });
        this.parseExistingTags();
        this.makeExistingTagList(this.scrollbox);
        this.makeTagList(this.scrollbox);
    };
    TagMode.prototype.makeTagList = function (container) {
        var _this = this;
        if (Array.isArray(this.tagList)) {
            this.makeTagListGroup(this.tagList, container);
        }
        else {
            $.each(this.tagList, function (groupName, group) {
                container.append({ type: 'header', label: groupName });
                if (Array.isArray(group)) { // if group is a list of tags
                    _this.makeTagListGroup(group, container);
                }
                else { // if group is a list of subgroups
                    var subdiv_1 = container.append({ type: 'div' });
                    $.each(group, function (subgroupName, subgroup) {
                        subdiv_1.append({ type: 'div', label: [Morebits.htmlNode('b', subgroupName)] });
                        _this.makeTagListGroup(subgroup, subdiv_1);
                    });
                }
            });
        }
    };
    // helper function for makeTagList()
    TagMode.prototype.makeTagListGroup = function (list, container) {
        var _this = this;
        var excludeTags = new Set(this.existingTags.filter(function (t) { var _a; return !((_a = _this.flatObject[t]) === null || _a === void 0 ? void 0 : _a.dupeAllowed); }));
        container.append({
            type: 'checkbox',
            name: 'tags',
            list: list.filter(function (item) { return !excludeTags.has(item.tag); }).map(function (item) { return ({
                label: '{{' + item.tag + '}}' + (item.description ? ': ' + item.description : ''),
                value: item.tag,
                subgroup: item.subgroup
            }); })
        });
    };
    TagMode.prototype.makeExistingTagList = function (container) {
        var _this = this;
        if (!this.existingTags.length) {
            return;
        }
        container.append({ type: 'header', label: 'Tags already present' });
        var tagConfigs = this.existingTags.map(function (tag) {
            return _this.flatObject[tag] || { tag: tag };
        });
        container.append({
            type: 'checkbox',
            name: 'existingTags',
            list: tagConfigs.map(function (item) { return ({
                label: '{{' + item.tag + '}}' + (item.description ? ': ' + item.description : ''),
                value: item.tag,
                checked: true,
                style: 'font-style: italic'
            }); })
        });
    };
    /**
     * Parse existing tags. This is NOT asynchronous.
     * Should be overridden for tag modes where removalSupported is true.
     * Populate this.existingTags with the names of tags present on the page.
     */
    TagMode.prototype.parseExistingTags = function () { };
    TagMode.prototype.constructFlatObject = function () {
        var _this = this;
        this.flatObject = {};
        if (Array.isArray(this.tagList)) {
            // this.tagList is of type tagData[]
            this.tagList.forEach(function (item) {
                _this.flatObject[item.tag] = item;
            });
        }
        else {
            obj_values(this.tagList).forEach(function (group) {
                obj_values(group).forEach(function (subgroup) {
                    if (Array.isArray(subgroup)) {
                        subgroup.forEach(function (item) {
                            _this.flatObject[item.tag] = item;
                        });
                    }
                    else {
                        _this.flatObject[subgroup.tag] = subgroup;
                    }
                });
            });
        }
    };
    TagMode.prototype.formAppendPatrolLink = function () {
        if (!document.getElementsByClassName('patrollink').length) {
            return;
        }
        this.form.append({
            type: 'checkbox',
            list: [{
                    label: 'Mark the page as patrolled/reviewed',
                    value: 'patrol',
                    name: 'patrol',
                    checked: Twinkle.getPref('markTaggedPagesAsPatrolled')
                }]
        });
    };
    TagMode.prototype.formRender = function () {
        this.form.append({
            type: 'submit',
            className: 'tw-tag-submit'
        });
        this.result = this.form.render();
        this.Window.setContent(this.result);
        this.Window.display();
    };
    TagMode.prototype.postRender = function () {
        QuickFilter.init(this.result);
        Morebits.quickForm.getElements(this.result, 'tags').forEach(Tag.makeArrowLinks);
        Morebits.quickForm.getElements(this.result, 'existingTags').forEach(Tag.makeArrowLinks);
        // style adjustments
        $(this.scrollbox).find('h5').css({ 'font-size': '110%' });
        $(this.scrollbox).find('h5:not(:first-child)').css({ 'margin-top': '1em' });
        $(this.scrollbox).find('div').filter(':has(span.quickformDescription)').css({ 'margin-top': '0.4em' });
        // Add status text node after Submit button
        var $status = $('<small>').attr('id', 'tw-tag-status');
        $status.insertAfter($('button.tw-tag-submit'));
        var addedCount = 0, removedCount = 0;
        // tally tags added/removed, update statusNode text
        $('[name=tags], [name=existingTags]').on('click', function (e) {
            var checkbox = e.target;
            if (checkbox.name === 'tags') {
                addedCount += checkbox.checked ? 1 : -1;
            }
            else if (checkbox.name === 'existingTags') {
                removedCount += checkbox.checked ? -1 : 1;
            }
            var firstPart = "Adding " + addedCount + " tag" + (addedCount > 1 ? 's' : '');
            var secondPart = "Removing " + removedCount + " tag" + (removedCount > 1 ? 's' : '');
            var statusText = (addedCount ? firstPart : '') + (removedCount ? (addedCount ? '; ' : '') + secondPart : '');
            $status.text('  ' + statusText);
        });
    };
    TagMode.prototype.evaluate = function () {
        var _this = this;
        this.captureFormData();
        var validationMessage = this.checkInputs();
        if (validationMessage) {
            return alert(validationMessage);
        }
        this.preprocessParams();
        Morebits.simpleWindow.setButtonsEnabled(false);
        Morebits.status.init(this.result);
        this.action().then(function () {
            Morebits.status.actionCompleted("Tagging complete, reloading " + _this.name + " in a few seconds");
            setTimeout(function () {
                window.location.href = mw.util.getUrl(Morebits.pageNameNorm, { redirect: 'no' });
            }, 1e9);
        });
    };
    TagMode.prototype.captureFormData = function () {
        this.params = Morebits.quickForm.getInputData(this.result);
        this.params.tagsToRemove = this.result.getUnchecked('existingTags'); // XXX: Morebits-defined function
        this.params.tagsToRetain = this.params.existingTags || [];
    };
    TagMode.prototype.checkInputs = function () {
        // Check if any tag is selected or if any already present tag is deselected
        if (this.params.tags.length === 0 && (!this.canRemove() || this.params.tagsToRemove.length === 0)) {
            return 'You must select at least one tag!';
        }
        return this.validateInput();
    };
    /**
     * If inputs are invalid, return a string that is shown to the user via alert().
     * If inputs are valid, don't return anything.
     */
    TagMode.prototype.validateInput = function () { };
    TagMode.prototype.preprocessParams = function () {
        this.getTemplateParameters();
    };
    TagMode.prototype.getTemplateParameters = function () {
        var _this = this;
        this.templateParams = {};
        this.params.tags.forEach(function (tag) {
            _this.templateParams[tag] = {};
            var subgroupObj = _this.flatObject[tag] && _this.flatObject[tag].subgroup;
            makeArray(subgroupObj).forEach(function (gr) {
                if (gr.parameter && (_this.params[gr.name] || gr.required)) {
                    _this.templateParams[tag][gr.parameter] = _this.params[gr.name] || '';
                }
            });
        });
    };
    /**
     * Get the regex to be used to search for or remove a tag.
     * @param tag
     */
    TagMode.prototype.getTagRegex = function (tag) {
        return new RegExp('\\{\\{' + Morebits.pageNameRegex(tag) + '\\s*(\\|[^}]*)?\\}\\}\\n?');
    };
    /**
     * This function assumes that grouping is enabled in the first place.
     * @param tag
     */
    TagMode.prototype.isGroupable = function (tag) {
        return this.flatObject[tag] ? !this.flatObject[tag].excludeInGroup : this.assumeUnknownTagsGroupable;
    };
    /**
     * Get regex that matches the start of the grouping template (the opening braces plus
     * the template name. The template name is captured as a regex group (pun unintended).
     */
    TagMode.prototype.groupRegex = function () {
        var regexString = '\\{\\{\\s*(' + this.groupTemplateNameRegex + ')\\s*(?:\\||\\}\\})';
        return new RegExp(regexString, this.groupTemplateNameRegexFlags);
    };
    /**
     * Generate the parameter text from the data stored in this.templateParams.
     * this.templateParams is populated automatically based on param names from the configs
     * and values from user input. If any additional changes to templateParams are required,
     * you can do that in preprocessParams().
     * @param tag
     */
    TagMode.prototype.getParameterText = function (tag) {
        if (!this.templateParams[tag]) {
            mw.log.warn('this.templateParams[tag] undefined');
            return '';
        }
        return obj_entries(this.templateParams[tag]).map(function (_a) {
            var key = _a[0], value = _a[1];
            return "|" + key + "=" + value;
        }).join('');
    };
    TagMode.prototype.getTagText = function (tag) {
        var subst = this.flatObject[tag] && this.flatObject[tag].subst ? 'subst:' : '';
        return '{{' + subst + tag + this.getParameterText(tag) + '}}';
    };
    TagMode.prototype.makeTagSetText = function (tags) {
        var _this = this;
        return tags.map(function (tag) { return _this.getTagText(tag) + '\n'; }).join('');
    };
    TagMode.prototype.addTagsOutsideGroup = function (tags) {
        var tagText = this.makeTagSetText(tags);
        this.pageText = this.insertTagText(tagText, this.pageText);
    };
    /**
     * If the tag is present in pageText, removes it from pageText and adds it to
     * params.groupableExistingTagsText.
     * @param tag
     */
    TagMode.prototype.shiftTag = function (tag) {
        var _this = this;
        var isShifted = false; // Avoid a .test() before the .replace() causing 2 regex searches
        this.pageText = this.pageText.replace(this.getTagRegex(tag), function (tagText) {
            isShifted = true;
            _this.params.groupableExistingTagsText += tagText.trim() + '\n'; // add to groupableExistingTagsText
            return ''; // remove from pageText
        });
        return isShifted;
    };
    /**
     * Get the wikitext of the groupable existing tags, removes it from the
     * page text and adds them to params.groupableExistingTagsText, which
     * the returned promise resolves to.
     */
    TagMode.prototype.spliceGroupableExistingTags = function () {
        var _this = this;
        this.params.groupableExistingTagsText = '';
        var tagsToShiftAsync = this.params.groupableExistingTags.filter(function (tag) {
            return !_this.shiftTag(tag);
        });
        if (tagsToShiftAsync.length === 0) {
            return $.Deferred().resolve(this.params.groupableExistingTagsText);
        }
        var api = new Morebits.wiki.api('Getting template redirects', this.getRedirectsQuery(tagsToShiftAsync));
        return api.post().then(function (apiobj) {
            var pages = apiobj.getResponse().query.pages.filter(function (p) {
                return !p.missing && !!p.linkshere;
            });
            pages.forEach(function (page) {
                var shifted = _this.shiftTag(stripNs(page.title));
                if (!shifted) {
                    shifted = page.linkshere.some(function (template) {
                        var tag = stripNs(template.title);
                        return _this.shiftTag(tag);
                    });
                }
                if (!shifted) { // unnecessary message?
                    new Morebits.status('Note', 'Failed to find {{' +
                        stripNs(page.title) + '}} on the page... skip repositioning');
                }
            });
            return _this.params.groupableExistingTagsText;
        });
    };
    /**
     * Remove tag from pageText, if it exists.
     * @param tag
     * @returns true if tag was removed, false otherwise
     */
    TagMode.prototype.removeTemplate = function (tag) {
        var isRemoved = false; // Avoid a .test() before the .replace() causing 2 regex searches
        this.pageText = this.pageText.replace(this.getTagRegex(tag), function () {
            isRemoved = true;
            return '';
        });
        return isRemoved;
    };
    TagMode.prototype.getRedirectsQuery = function (tags) {
        return {
            'action': 'query',
            'prop': 'linkshere',
            'titles': tags.map(function (pg) { return 'Template:' + pg; }),
            'redirects': 1,
            'lhnamespace': '10',
            'lhshow': 'redirect',
            'lhlimit': 'max',
            'format': 'json',
        };
    };
    /**
     * Remove tags from pageText
     */
    TagMode.prototype.removeTags = function () {
        var _this = this;
        var params = this.params;
        if (!params.tagsToRemove.length) {
            return $.Deferred().resolve();
        }
        Morebits.status.info('Untagging', 'Already present tags: removing de-selected tags');
        var tagsToRemoveAsync = params.tagsToRemove.filter(function (tag) {
            return !_this.removeTemplate(tag);
        });
        if (tagsToRemoveAsync.length === 0) {
            return $.Deferred().resolve();
        }
        // Remove tags which appear in page text as redirects
        var statusMessage = "Getting redirects for " + mw.language.listToText(tagsToRemoveAsync.map(function (t) { return '{{' + t + '}}'; }));
        var api = new Morebits.wiki.api(statusMessage, this.getRedirectsQuery(tagsToRemoveAsync));
        return api.post().then(function (apiobj) {
            var pages = apiobj.getResponse().query.pages.filter(function (p) {
                return (!p.missing && !!p.linkshere) || Morebits.status.warn('Info', 'Failed to find {{' +
                    stripNs(p.title) + '}} on the page... excluding');
            });
            (apiobj.getResponse().query.redirects || []).forEach(function (_a) {
                var from = _a.from, to = _a.to;
                new Morebits.status('Note', "Resolved template redirect {{" + stripNs(from) + "}} to {{" + stripNs(to) + "}}");
            });
            pages.forEach(function (page) {
                var removed = _this.removeTemplate(stripNs(page.title));
                if (!removed) {
                    removed = page.linkshere.some(function (template) {
                        var tag = stripNs(template.title);
                        return _this.removeTemplate(tag);
                    });
                }
                if (!removed) {
                    Morebits.status.warn('Note', 'Failed to find {{' +
                        stripNs(page.title) + '}} on the page... cannot remove');
                }
            });
        });
    };
    TagMode.prototype.initialCleanup = function () { };
    TagMode.prototype.shouldAddGroup = function () {
        var params = this.params;
        return this.groupTemplateName && !params.disableGrouping &&
            (params.groupableExistingTags.length + params.groupableNewTags.length) >= this.groupMinSize;
    };
    /**
     * Given that the group exists on `pageText` (either added by us now or existed before),
     * move given `tagText` into the group
     * @param tagText
     */
    TagMode.prototype.addTagsIntoGroup = function (tagText) {
        if (!tagText) {
            if (tagText === undefined)
                throw new Error('tagText undefined');
            return;
        }
        var groupRgxExec = this.groupRegex().exec(this.pageText);
        // Add new tags into group, and put the updated group wikitext into this.pageText
        var miRegex = new RegExp('(\\{\\{\\s*' + // Opening braces
            groupRgxExec[1] + // template name
            // XXX: unnecessarily overspecific from this point onwards
            '\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)' + // ??? Copied from friendlytag
            '\\}\\}\\s*' // Closing braces, followed by spaces/newlines
        , 'im');
        this.pageText = this.pageText.replace(miRegex, '$1' + tagText + '}}\n');
    };
    /**
     * Controls how the final text of new tags is inserted into the page.
     * Defaults to just putting them at the very top of the page, along with two newlines.
     * You may want to override this if you want them to go below any hatnotes or deletion
     * notices (use Morebits.wikitext.page#insertAfterTemplates, see enwiki ArticleMode).
     * @param tagText
     * @param pageText
     */
    TagMode.prototype.insertTagText = function (tagText, pageText) {
        return tagText + '\n' + pageText;
    };
    TagMode.prototype.finalCleanup = function () {
        var _this = this;
        if (!this.groupTemplateName || this.params.groupingDisabled) {
            return;
        }
        // Remove any groups containing less than minGroupSize tags
        // XXX: This might misbehave if existing tags in the MI have parameters
        // that contain nested templates.
        // TODO: use regex-less parsing.
        var nItemGroupRegex = function (n) {
            var start = '\\{\\{\\s*' + _this.groupTemplateNameRegex + '\\s*\\|\\s*(';
            var tags = '(?:\\{\\{[^}]+\\}\\}\\s*){' + n + '}';
            var end = ')\\}\\}\\n?';
            var regexString = start + tags + end;
            return new RegExp(regexString, _this.groupTemplateNameRegexFlags);
        };
        // unbind substs of time parser functions
        var unbinder = new Morebits.unbinder(this.pageText);
        unbinder.unbind('\\{\\{subst:CURRENT', '\\}\\}');
        for (var i = 0; i < this.groupMinSize; i++) {
            unbinder.content = unbinder.content.replace(nItemGroupRegex(i), '$1');
        }
        this.pageText = unbinder.rebind();
    };
    TagMode.prototype.action = function () {
        var _this = this;
        this.pageobj = new Twinkle.page(Morebits.pageNameNorm, 'Tagging ' + this.name);
        return this.pageobj.load().then(function (pageobj) {
            _this.pageText = pageobj.getPageText();
            _this.initialCleanup();
            _this.sortTags();
            return $.when(_this.addAndRearrangeTags(), _this.removeTags()).then(function () {
                _this.finalCleanup();
                return _this.savePage();
            });
        });
    };
    TagMode.prototype.sortTags = function () { };
    TagMode.prototype.addAndRearrangeTags = function () {
        this.pageText = this.insertTagText(this.makeTagSetText(this.params.tags), this.pageText);
    };
    TagMode.prototype.savePage = function () {
        this.pageobj.setPageText(this.pageText);
        this.pageobj.setEditSummary(Tag.makeEditSummary(this.params.tags, this.params.tagsToRemove, this.params.reason));
        this.pageobj.setWatchlist(Twinkle.getPref('watchTaggedPages'));
        this.pageobj.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
        this.pageobj.setCreateOption('nocreate');
        if (this.params.patrol) {
            this.pageobj.triage();
        }
        return this.pageobj.save();
    };
    return TagMode;
}());
var RedirectMode = /** @class */ (function (_super) {
    __extends(RedirectMode, _super);
    function RedirectMode() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'redirect';
        _this.tagList = Twinkle.RedirectModeTagList;
        _this.removalSupported = true;
        _this.groupTemplateName = 'Redirect category shell';
        // Accounts for almost all the redirects of [[Template:Redirect category shell]].
        // {{This is a redirect}} is skipped as it has just 170 transclusions.
        _this.groupTemplateNameRegex = '(?:R(?:edirect)?(?: ?cat)?(?:egory)? ?shell|Redr)';
        _this.groupTemplateNameRegexFlags = 'i';
        // Used in finalCleanup()
        _this.groupMinSize = 1;
        // Ends up being unused since, we are defining our own addAndRearrangeTags(), but still
        // worth defining for clarity, I guess
        _this.assumeUnknownTagsGroupable = true;
        return _this;
    }
    RedirectMode.isActive = function () {
        return Morebits.isPageRedirect();
    };
    RedirectMode.prototype.getMenuTooltip = function () {
        return 'Tag redirect';
    };
    RedirectMode.prototype.getWindowTitle = function () {
        return 'Redirect tagging';
    };
    RedirectMode.prototype.makeForm = function (Window) {
        _super.prototype.makeForm.call(this, Window);
        if (Twinkle.getPref('customRedirectTagList').length) {
            this.scrollbox.append({ type: 'header', label: 'Custom tags' });
            this.scrollbox.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customRedirectTagList') });
        }
        this.formAppendPatrolLink();
    };
    RedirectMode.prototype.parseExistingTags = function () {
        var _this = this;
        this.existingTags = [];
        if (!this.canRemove()) {
            return;
        }
        $('.rcat').each(function (idx, rcat) {
            var title = rcat.className.slice('rcat rcat-'.length).replace(/_/g, ' ');
            _this.existingTags.push(title);
        });
    };
    RedirectMode.prototype.sortTags = function () {
        var _this = this;
        var params = this.params;
        params.newTags = params.tags.filter(function (tag) {
            var exists = _this.getTagRegex(tag).test(_this.pageText);
            if (exists && (!_this.flatObject[tag] || !_this.flatObject[tag].dupeAllowed)) {
                Morebits.status.warn('Info', "Found {{" + tag + "}} on the " + _this.name + " already... excluding");
                return false; // remove from params.newTags
            }
            return true;
        });
        // Everything is groupable, setting params.groupableNewTags, params.nonGroupableNewTags, etc
        // isn't needed since we are anyway defining our own addAndRearrangeTags() below
    };
    /**
     * An override is used here: since all Rcat templates begin with "R " or "Redirect ", we can
     * identify them all from the wikitext and rearrange them if necessary. The super addAndRearrangeTags()
     * uses params.tagsToRetain which is populated from the checked items of the "Tags already present"
     * section of the dialog. Using that is unnecessary and limiting as it can make API calls and even
     * then won't include the templates which didn't have the right CSS class.
     * This removes the need to define insertTagText() and a few other methods.
     */
    RedirectMode.prototype.addAndRearrangeTags = function () {
        var _this = this;
        var params = this.params;
        // Take out the existing Rcats on the page, to be reinserted in Rcat shell.
        var existingTags = this.pageText.match(/\s*\{\{R(?:edirect)? [^{}]*?\}\}/ig) || [];
        var existingTagText = '';
        existingTags.forEach(function (tag) {
            _this.pageText = _this.pageText.replace(tag, '');
            existingTagText += tag.trim() + '\n';
        });
        /// Case 1. Group exists: New groupable tags put into group. Existing groupable tags that were outside are also pulled in.
        if (this.groupRegex().test(this.pageText)) {
            Morebits.status.info('Info', 'Adding tags inside existing {{Redirect category shell}}');
            this.addTagsIntoGroup(existingTagText + this.makeTagSetText(params.newTags));
            /// Case 2. No group exists, but should be added: Group created. Existing groupable tags are put in it. New groupable tags also put in it.
        }
        else {
            Morebits.status.info('Info', 'Grouping tags inside {{Redirect category shell}}');
            var groupedTagsText = '{{' + this.groupTemplateName + '|\n' +
                existingTagText +
                this.makeTagSetText(params.newTags) +
                '}}';
            this.pageText += '\n' + groupedTagsText;
        }
        /// If group needs to be removed because of removal of tags, that's handled in finalCleanup, not here.
    };
    return RedirectMode;
}(TagMode));
var ArticleMode = /** @class */ (function (_super) {
    __extends(ArticleMode, _super);
    function ArticleMode() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'article';
        _this.tagList = Twinkle.ArticleModeTagList;
        _this.removalSupported = true;
        // Configurations
        _this.groupTemplateName = 'Multiple issues';
        _this.groupTemplateNameRegex = '(?:multiple ?issues|article ?issues|mi)(?!\\s*\\|\\s*section\\s*=)';
        _this.groupTemplateNameRegexFlags = 'i';
        _this.groupMinSize = 2;
        _this.assumeUnknownTagsGroupable = false;
        return _this;
    }
    ArticleMode.isActive = function () {
        return [0, 118].indexOf(mw.config.get('wgNamespaceNumber')) !== -1 &&
            mw.config.get('wgCurRevisionId'); // check if page exists
    };
    ArticleMode.prototype.getMenuTooltip = function () {
        return 'Add or remove article maintenance tags';
    };
    ArticleMode.prototype.getWindowTitle = function () {
        return 'Article maintenance tagging';
    };
    ArticleMode.prototype.makeForm = function (Window) {
        _super.prototype.makeForm.call(this, Window);
        // append any custom tags
        if (Twinkle.getPref('customTagList').length) {
            this.scrollbox.append({ type: 'header', label: 'Custom tags' });
            this.scrollbox.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customTagList') });
        }
        this.form.append({
            type: 'checkbox',
            list: [{
                    label: 'Group inside {{multiple issues}} if possible',
                    value: 'group',
                    name: 'group',
                    tooltip: 'If applying two or more templates supported by {{multiple issues}} and this box is checked, all supported templates will be grouped inside a {{multiple issues}} template.',
                    checked: Twinkle.getPref('groupByDefault')
                }]
        });
        this.form.append({
            type: 'input',
            label: 'Reason',
            name: 'reason',
            tooltip: 'Optional reason to be appended in edit summary. Recommended when removing tags.',
            size: '60px'
        });
        this.formAppendPatrolLink();
    };
    ArticleMode.prototype.parseExistingTags = function () {
        var _this = this;
        this.existingTags = [];
        if (!this.canRemove()) {
            return;
        }
        // All tags are HTML table elements that are direct children of .mw-parser-output,
        // except when they are within {{multiple issues}}
        $('.mw-parser-output').children().each(function (i, e) {
            // break out on encountering the first heading, which means we are no
            // longer in the lead section
            if (e.tagName === 'H2') {
                return false;
            }
            // The ability to remove tags depends on the template's {{ambox}} |name=
            // parameter bearing the template's correct name (preferably) or a name that at
            // least redirects to the actual name
            // All tags have their first class name as "box-" + template name
            if (e.className.indexOf('box-') === 0) {
                if (e.classList[0] === 'box-Multiple_issues') {
                    $(e).find('.ambox').each(function (idx, e) {
                        var tag = e.classList[0].slice(4).replace(/_/g, ' ');
                        _this.existingTags.push(tag);
                    });
                    return; // continue
                }
                var tag = e.classList[0].slice(4).replace(/_/g, ' ');
                _this.existingTags.push(tag);
            }
        });
        // {{Uncategorized}} and {{Improve categories}} are usually placed at the end
        if ($('.box-Uncategorized').length) {
            this.existingTags.push('Uncategorized');
        }
        if ($('.box-Improve_categories').length) {
            this.existingTags.push('Improve categories');
        }
    };
    // Tagging process:
    /// Initial cleanup
    /// Checking if group is present, or if it needs to be added
    /// Adding selected tags
    /// Putting existing tags into group if it's being added
    /// Removing unselected existing tags
    /// Final cleanup
    /// Save
    ArticleMode.prototype.validateInput = function () {
        var params = this.params, tags = params.tags;
        if (['Merge', 'Merge from', 'Merge to'].filter(function (t) { return arr_includes(tags, t); }).length > 1) {
            return 'Please select only one of {{Merge}}, {{Merge from}} and {{Merge to}}. If several merges are required, use {{Merge}} and separate the article names with pipes (although in this case Twinkle cannot tag the other articles automatically).';
        }
        if ((params.mergeTagOther || params.mergeReason) && params.mergeTarget.indexOf('|') !== -1) {
            return 'Tagging multiple articles in a merge, and starting a discussion for multiple articles, is not supported at the moment. Please turn off "tag other article", and/or clear out the "reason" box, and try again.';
        }
        if (['Not English', 'Rough translation'].filter(function (t) { return arr_includes(tags, t); }).length > 1) {
            return 'Please select only one of {{Not English}} and {{Rough translation}}..';
        }
    };
    ArticleMode.prototype.preprocessParams = function () {
        var _this = this;
        _super.prototype.preprocessParams.call(this);
        var params = this.params;
        params.disableGrouping = !params.group;
        params.tags.forEach(function (tag) {
            switch (tag) {
                case 'Not English':
                case 'Rough translation':
                    if (params.translationPostAtPNT) {
                        _this.templateParams[tag].listed = 'yes';
                    }
                    break;
                case 'Merge':
                case 'Merge to':
                case 'Merge from':
                    params.mergeTag = tag;
                    // normalize the merge target for now and later
                    params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));
                    _this.templateParams[tag]['1'] = params.mergeTarget;
                    // link to the correct section on the talk page, for article space only
                    if (mw.config.get('wgNamespaceNumber') === 0 && (params.mergeReason || params.discussArticle)) {
                        if (!params.discussArticle) {
                            // discussArticle is the article whose talk page will contain the discussion
                            params.discussArticle = tag === 'Merge to' ? params.mergeTarget : mw.config.get('wgTitle');
                            // nonDiscussArticle is the article which won't have the discussion
                            params.nonDiscussArticle = tag === 'Merge to' ? mw.config.get('wgTitle') : params.mergeTarget;
                            var direction = '[[' + params.nonDiscussArticle + ']]' + (params.mergeTag === 'Merge' ? ' with ' : ' into ') + '[[' + params.discussArticle + ']]';
                            params.talkDiscussionTitleLinked = 'Proposed merge of ' + direction;
                            params.talkDiscussionTitle = params.talkDiscussionTitleLinked.replace(/\[\[(.*?)\]\]/g, '$1');
                        }
                        _this.templateParams[tag].discuss = 'Talk:' + params.discussArticle + '#' + params.talkDiscussionTitle;
                    }
                    break;
                default:
                    break;
            }
        });
    };
    ArticleMode.prototype.initialCleanup = function () {
        this.pageText = this.pageText
            .replace(/\{\{\s*([Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
    };
    // getTagSearchRegex(tag) {
    // 	return new RegExp('\\{\\{' + tag + '(\\||\\}\\})', 'im');
    // }
    /**
     * Create params.newTags, params.groupableNewTags, params.nonGroupableNewTags,
     * params.groupableExistingTags
     * Any tags to be added at the bottom of the page get added in this function itself.
     */
    ArticleMode.prototype.sortTags = function () {
        var _this = this;
        var params = this.params;
        params.newTags = params.tags.filter(function (tag) {
            var exists = _this.getTagRegex(tag).test(_this.pageText);
            if (exists && (!_this.flatObject[tag] || !_this.flatObject[tag].dupeAllowed)) {
                Morebits.status.warn('Info', "Found {{" + tag + "}} on the " + _this.name + " already... excluding");
                // XXX: don't do anything else with merge tags: handle this better!
                if (['Merge', 'Merge to'].indexOf(tag) !== -1) {
                    params.mergeTarget = params.mergeReason = params.mergeTagOther = null;
                }
                return false; // remove from params.newTags
            }
            else if (tag === 'Uncategorized' || tag === 'Improve categories') {
                _this.pageText += '\n\n' + _this.getTagText(tag);
                return false; // remove from params.newTags, since it's now already inserted
            }
            return true;
        });
        if (!this.groupTemplateName) { // tag grouping disabled
            return;
        }
        params.groupableExistingTags = params.tagsToRetain.filter(function (tag) { return _this.isGroupable(tag); });
        params.groupableNewTags = [];
        params.nonGroupableNewTags = [];
        params.newTags.forEach(function (tag) {
            if (_this.isGroupable(tag)) {
                params.groupableNewTags.push(tag);
            }
            else {
                params.nonGroupableNewTags.push(tag);
            }
        });
    };
    /**
     * Adds new tags to pageText. If there are existing tags which are groupable but outside the
     * group, they are put into it.
     */
    ArticleMode.prototype.addAndRearrangeTags = function () {
        var _this = this;
        var params = this.params;
        // Grouping disabled for this mode
        if (!this.groupTemplateName) {
            this.addTagsOutsideGroup(params.newTags);
            return $.Deferred().resolve();
        }
        /// Case 1. Group exists: New groupable tags put into group. Existing groupable tags that were outside are pulled in.
        if (this.groupRegex().test(this.pageText)) {
            Morebits.status.info('Info', 'Adding supported tags inside existing {{multiple issues}} tag');
            this.addTagsOutsideGroup(params.nonGroupableNewTags);
            // ensure all groupable existing tags are in group
            return this.spliceGroupableExistingTags().then(function (groupableExistingTagsText) {
                _this.addTagsIntoGroup(groupableExistingTagsText + _this.makeTagSetText(params.groupableNewTags));
            });
            /// Case 2. No group exists, but should be added: Group created. Existing groupable tags are put in it. New groupable tags also put in it.
        }
        else if (this.shouldAddGroup()) {
            Morebits.status.info('Info', 'Grouping supported tags inside {{multiple issues}}');
            return this.spliceGroupableExistingTags().then(function (groupableExistingTagsText) {
                var groupedTagsText = '{{' + _this.groupTemplateName + '|\n' +
                    _this.makeTagSetText(params.groupableNewTags) +
                    groupableExistingTagsText +
                    '}}';
                var ungroupedTagsText = _this.makeTagSetText(params.nonGroupableNewTags);
                _this.pageText = _this.insertTagText(groupedTagsText + '\n' + ungroupedTagsText, _this.pageText);
            });
            /// Case 3. No group exists, no group to be added
        }
        else {
            this.addTagsOutsideGroup(params.newTags);
            return $.Deferred().resolve();
        }
        /// If group needs to be removed because of removal of tags, that's handled in finalCleanup, not here.
    };
    /**
     * Inserts `tagText` (the combined wikitext of one or more tags) to the top of the
     * pageText at the correct position, taking account of any existing hatnote templates.
     * @param tagText
     * @param pageText
     */
    ArticleMode.prototype.insertTagText = function (tagText, pageText) {
        // Insert tag after short description or any hatnotes,
        // as well as deletion/protection-related templates
        var wikipage = new Morebits.wikitext.page(pageText);
        var templatesAfter = Twinkle.hatnoteRegex +
            // Protection templates
            'pp|pp-.*?|' +
            // CSD
            'db|delete|db-.*?|speedy deletion-.*?|' +
            // PROD
            '(?:proposed deletion|prod blp)\\/dated(?:\\s*\\|(?:concern|user|timestamp|help).*)+|' +
            // not a hatnote, but sometimes under a CSD or AfD
            'salt|proposed deletion endorsed';
        // AfD is special, as the tag includes html comments before and after the actual template
        // trailing whitespace/newline needed since this subst's a newline
        var afdRegex = '(?:<!--.*AfD.*\\n\\{\\{(?:Article for deletion\\/dated|AfDM).*\\}\\}\\n<!--.*(?:\\n<!--.*)?AfD.*(?:\\s*\\n))?';
        return wikipage.insertAfterTemplates(tagText, templatesAfter, null, afdRegex).getText();
    };
    // Override to include |date= param, which is applicable for all tags
    // Could also have done this by adding the date param for all tags in
    // this.templateParams thorough this.preprocessParams()
    ArticleMode.prototype.getTagText = function (tag) {
        return '{{' + tag + this.getParameterText(tag) +
            '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}';
    };
    ArticleMode.prototype.savePage = function () {
        var _this = this;
        return _super.prototype.savePage.call(this).then(function () {
            return _this.postSave(_this.pageobj);
        });
    };
    ArticleMode.prototype.postSave = function (pageobj) {
        var _this = this;
        var params = this.params;
        var promises = [];
        // special functions for merge tags
        if (params.mergeReason) {
            // post the rationale on the talk page (only operates in main namespace)
            var talkpage = new Twinkle.page('Talk:' + params.discussArticle, 'Posting rationale on talk page');
            talkpage.setNewSectionText(params.mergeReason.trim() + ' ~~~~');
            talkpage.setNewSectionTitle(params.talkDiscussionTitleLinked);
            talkpage.setChangeTags(Twinkle.changeTags);
            talkpage.setWatchlist(Twinkle.getPref('watchMergeDiscussions'));
            talkpage.setCreateOption('recreate');
            promises.push(talkpage.newSection());
        }
        if (params.mergeTagOther) {
            // tag the target page if requested
            var otherTagName = 'Merge';
            if (params.mergeTag === 'Merge from') {
                otherTagName = 'Merge to';
            }
            else if (params.mergeTag === 'Merge to') {
                otherTagName = 'Merge from';
            }
            var otherpage = new Twinkle.page(params.mergeTarget, 'Tagging other page (' +
                params.mergeTarget + ')');
            otherpage.setChangeTags(Twinkle.changeTags);
            promises.push(otherpage.load().then(function (otherpage) {
                _this.templateParams[otherTagName] = {
                    1: Morebits.pageNameNorm,
                    discuss: _this.templateParams[params.mergeTag].discuss || ''
                };
                // XXX: check if {{Merge from}} or {{Merge}} tag already exists?
                var pageText = _this.insertTagText(_this.getTagText(otherTagName) + '\n', otherpage.getPageText());
                otherpage.setPageText(pageText);
                otherpage.setEditSummary(Tag.makeEditSummary([otherTagName], []));
                otherpage.setWatchlist(Twinkle.getPref('watchTaggedPages'));
                otherpage.setMinorEdit(Twinkle.getPref('markTaggedPagesAsMinor'));
                otherpage.setCreateOption('nocreate');
                return otherpage.save();
            }));
        }
        // post at WP:PNT for {{not English}} and {{rough translation}} tag
        if (params.translationPostAtPNT) {
            var pntPage = new Twinkle.page('Wikipedia:Pages needing translation into English', 'Listing article at Wikipedia:Pages needing translation into English');
            pntPage.setFollowRedirect(true);
            promises.push(pntPage.load().then(function friendlytagCallbacksTranslationListPage(pageobj) {
                var old_text = pageobj.getPageText();
                var template = params.tags.indexOf('Rough translation') !== -1 ? 'duflu' : 'needtrans';
                var lang = params.translationLanguage;
                var reason = params.translationComments;
                var templateText = '{{subst:' + template + '|pg=' + Morebits.pageNameNorm + '|Language=' +
                    (lang || 'uncertain') + '|Comments=' + reason.trim() + '}} ~~~~';
                var text, summary;
                if (template === 'duflu') {
                    text = old_text + '\n\n' + templateText;
                    summary = 'Translation cleanup requested on ';
                }
                else {
                    text = old_text.replace(/\n+(==\s?Translated pages that could still use some cleanup\s?==)/, '\n\n' + templateText + '\n\n$1');
                    summary = 'Translation' + (lang ? ' from ' + lang : '') + ' requested on ';
                }
                if (text === old_text) {
                    pageobj.getStatusElement().error('failed to find target spot for the discussion');
                    return;
                }
                pageobj.setPageText(text);
                pageobj.setEditSummary(summary + ' [[:' + Morebits.pageNameNorm + ']]');
                pageobj.setChangeTags(Twinkle.changeTags);
                pageobj.setCreateOption('recreate');
                return pageobj.save();
            }));
        }
        if (params.translationNotify) {
            var statElem_1 = new Morebits.status('Looking up creator');
            pageobj.setStatusElement(statElem_1);
            promises.push(pageobj.lookupCreation().then(function (pageobj) {
                var initialContrib = pageobj.getCreator();
                statElem_1.info("Found " + initialContrib);
                // Disallow warning yourself
                if (initialContrib === mw.config.get('wgUserName')) {
                    statElem_1.warn('You (' + initialContrib + ') created this page; skipping user notification');
                    return;
                }
                var userTalkPage = new Twinkle.page('User talk:' + initialContrib, 'Notifying initial contributor (' + initialContrib + ')');
                userTalkPage.setNewSectionTitle('Your article [[' + Morebits.pageNameNorm + ']]');
                userTalkPage.setNewSectionText('{{subst:uw-notenglish|1=' + Morebits.pageNameNorm +
                    (params.translationPostAtPNT ? '' : '|nopnt=yes') + '}} ~~~~');
                userTalkPage.setEditSummary('Notice: Please use English when contributing to the English Wikipedia.');
                userTalkPage.setChangeTags(Twinkle.changeTags);
                userTalkPage.setCreateOption('recreate');
                userTalkPage.setFollowRedirect(true, false);
                return userTalkPage.newSection();
            }));
        }
        return $.when.apply($, promises);
    };
    return ArticleMode;
}(TagMode));
var FileMode = /** @class */ (function (_super) {
    __extends(FileMode, _super);
    function FileMode() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = 'file';
        _this.tagList = Twinkle.FileModeTagList;
        return _this;
    }
    FileMode.isActive = function () {
        return mw.config.get('wgNamespaceNumber') === 6 &&
            !document.getElementById('mw-sharedupload') &&
            !!document.getElementById('mw-imagepage-section-filehistory');
    };
    FileMode.prototype.getMenuTooltip = function () {
        return 'Add maintenance tags to file';
    };
    FileMode.prototype.getWindowTitle = function () {
        return 'File maintenance tagging';
    };
    FileMode.prototype.makeForm = function (Window) {
        _super.prototype.makeForm.call(this, Window);
        if (Twinkle.getPref('customFileTagList').length) {
            this.scrollbox.append({ type: 'header', label: 'Custom tags' });
            this.scrollbox.append({ type: 'checkbox', name: 'tags', list: Twinkle.getPref('customFileTagList') });
        }
        this.formAppendPatrolLink();
    };
    FileMode.prototype.validateInput = function () {
        // Given an array of incompatible tags, check if we have two or more selected
        var params = this.params, tags = this.params.tags;
        var incompatibleSets = [
            ['Bad GIF', 'Bad JPEG', 'Bad SVG', 'Bad format'],
            ['Should be PNG', 'Should be SVG', 'Should be text'],
            ['Bad SVG', 'Vector version available'],
            ['Bad JPEG', 'Overcompressed JPEG'],
            ['PNG version available', 'Vector version available']
        ];
        for (var _i = 0, incompatibleSets_1 = incompatibleSets; _i < incompatibleSets_1.length; _i++) {
            var set = incompatibleSets_1[_i];
            if (set.filter(function (t) { return arr_includes(tags, t); }).length > 1) {
                return 'Please select only one of: {{' + set.join('}}, {{') + '}}.';
            }
        }
        // Get extension from either mime-type or title, if not present (e.g., SVGs)
        var extension = ((extension = $('.mime-type').text()) && extension.split(/\//)[1]) ||
            mw.Title.newFromText(Morebits.pageNameNorm).getExtension();
        if (extension) {
            var extensionUpper = extension.toUpperCase();
            // What self-respecting file format has *two* extensions?!
            if (extensionUpper === 'JPG') {
                extension = 'JPEG';
            }
            // Check that selected templates make sense given the file's extension.
            // Bad GIF|JPEG|SVG
            var badIndex; // Keep track of where the offending template is so we can reference it below
            if ((extensionUpper !== 'GIF' && ((badIndex = tags.indexOf('Bad GIF')) !== -1)) ||
                (extensionUpper !== 'JPEG' && ((badIndex = tags.indexOf('Bad JPEG')) !== -1)) ||
                (extensionUpper !== 'SVG' && ((badIndex = tags.indexOf('Bad SVG')) !== -1))) {
                var suggestion = 'This appears to be a ' + extension + ' file, ';
                if (['GIF', 'JPEG', 'SVG'].indexOf(extensionUpper) !== -1) {
                    suggestion += 'please use {{Bad ' + extensionUpper + '}} instead.';
                }
                else {
                    suggestion += 'so {{' + tags[badIndex] + '}} is inappropriate.';
                }
                return suggestion;
            }
            // Should be PNG|SVG
            if ((tags.toString().indexOf('Should be ') !== -1) && (tags.indexOf('Should be ' + extensionUpper) !== -1)) {
                return 'This is already a ' + extension + ' file, so {{Should be ' + extensionUpper + '}} is inappropriate.';
            }
            // Overcompressed JPEG
            if (tags.indexOf('Overcompressed JPEG') !== -1 && extensionUpper !== 'JPEG') {
                return 'This appears to be a ' + extension + ' file, so {{Overcompressed JPEG}} probably doesn\'t apply.';
            }
            // Bad trace and Bad font
            if (extensionUpper !== 'SVG') {
                if (tags.indexOf('Bad trace') !== -1) {
                    return 'This appears to be a ' + extension + ' file, so {{Bad trace}} probably doesn\'t apply.';
                }
                else if (tags.indexOf('Bad font') !== -1) {
                    return 'This appears to be a ' + extension + ' file, so {{Bad font}} probably doesn\'t apply.';
                }
            }
        }
        if (tags.indexOf('Do not move to Commons') !== -1 && params.DoNotMoveToCommons_expiry &&
            (!/^2\d{3}$/.test(params.DoNotMoveToCommons_expiry) || parseInt(params.DoNotMoveToCommons_expiry, 10) <= new Date().getFullYear())) {
            return 'Must be a valid future year.';
        }
    };
    FileMode.prototype.initialCleanup = function () {
        var _this = this;
        this.params.tags.forEach(function (tag) {
            switch (tag) {
                // when other commons-related tags are placed, remove "move to Commons" tag
                case 'Keep local':
                case 'Now Commons':
                case 'Do not move to Commons':
                    _this.pageText = _this.pageText.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
                    break;
                case 'Vector version available':
                    _this.pageText = _this.pageText.replace(/\{\{((convert to |convertto|should be |shouldbe|to)?svg|badpng|vectorize)[^}]*\}\}/gi, '');
                    break;
                case 'Orphaned non-free revisions':
                    // remove {{non-free reduce}} and redirects
                    _this.pageText = _this.pageText.replace(/\{\{\s*(Template\s*:\s*)?(Non-free reduce|FairUseReduce|Fairusereduce|Fair Use Reduce|Fair use reduce|Reduce size|Reduce|Fair-use reduce|Image-toobig|Comic-ovrsize-img|Non-free-reduce|Nfr|Smaller image|Nonfree reduce)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, '');
                    break;
                default:
                    break;
            }
        });
    };
    return FileMode;
}(TagMode));
var QuickFilter = /** @class */ (function () {
    function QuickFilter() {
    }
    QuickFilter.init = function (result) {
        QuickFilter.$allCheckboxDivs = $(result).find('[name=tags], [name=existingTags]').parent();
        QuickFilter.$allHeaders = $(result).find('h5, .quickformDescription');
        result.quickfilter.focus(); // place cursor in the quick filter field as soon as window is opened
        result.quickfilter.autocomplete = 'off'; // disable browser suggestions
        result.quickfilter.addEventListener('keypress', function (e) {
            if (e.keyCode === 13) { // prevent enter key from accidentally submitting the form
                e.preventDefault();
                return false;
            }
        });
    };
    QuickFilter.onInputChange = function () {
        // flush the DOM of all existing underline spans
        QuickFilter.$allCheckboxDivs.find('.search-hit').each(function (i, e) {
            var label_element = e.parentElement;
            // This would convert <label>Hello <span class=search-hit>wo</span>rld</label>
            // to <label>Hello world</label>
            label_element.innerHTML = label_element.textContent;
        });
        if (this.value) {
            QuickFilter.$allCheckboxDivs.hide();
            QuickFilter.$allHeaders.hide();
            var searchString = this.value;
            var searchRegex = new RegExp(mw.util.escapeRegExp(searchString), 'i');
            QuickFilter.$allCheckboxDivs.find('label').each(function () {
                var label_text = this.textContent;
                var searchHit = searchRegex.exec(label_text);
                if (searchHit) {
                    var range = document.createRange();
                    var textnode = this.childNodes[0];
                    range.selectNodeContents(textnode);
                    range.setStart(textnode, searchHit.index);
                    range.setEnd(textnode, searchHit.index + searchString.length);
                    var underline_span = $('<span>').addClass('search-hit').css('text-decoration', 'underline')[0];
                    range.surroundContents(underline_span);
                    this.parentElement.style.display = 'block'; // show
                }
            });
        }
        else {
            QuickFilter.$allCheckboxDivs.show();
            QuickFilter.$allHeaders.show();
        }
    };
    return QuickFilter;
}());
function stripNs(title) {
    return new mw.Title(title).getMainText();
}
function makeArray(obj) {
    if (!obj) {
        return [];
    }
    if (Array.isArray(obj)) {
        return obj;
    }
    return [obj];
}
// Override to change modes available,
// each mode is a class extending TagMode
Tag.modeList = [
    RedirectMode,
    ArticleMode,
    FileMode
];
Twinkle.addInitCallback(function () { new Tag(); }, 'Tag');
//# sourceMappingURL=tag.js.map