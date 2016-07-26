'use strict';

const Backbone = require('backbone');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');
const Locale = require('../../util/locale');
const AppSettingsModel = require('../../models/app-settings-model');
const EntryPresenter = require('../../presenters/entry-presenter');
const Scrollable = require('../../mixins/scrollable');

let AutoTypePopupView = Backbone.View.extend({
    el: 'body',

    template: require('templates/auto-type/auto-type-select.hbs'),
    itemTemplate: require('templates/auto-type/auto-type-select-item.hbs'),

    events: {
        'click .at-select__header-filter-clear': 'clearFilterText',
        'click .at-select__message-clear-filter': 'clearFilterWindow',
        'click .at-select__item': 'itemClicked'
    },

    result: null,
    entries: null,

    initialize() {
        this.initScroll();
        this.listenTo(Backbone, 'main-window-blur', this.mainWindowBlur);
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_UP, this.upPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.downPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, this, false, true);
        KeyHandler.on('keypress:auto-type', this.keyPressed.bind(this));
        KeyHandler.setModal('auto-type');
    },

    render() {
        let topMessage, topClearFilterVisible;
        if (this.model.filter.title || this.model.filter.url) {
            topMessage = Locale.autoTypeMsgMatchedByWindow.replace('{}',
                this.model.filter.title || this.model.filter.url);
            topClearFilterVisible = !this.model.filter.ignoreWindowInfo;
        } else {
            topMessage = Locale.autoTypeMsgNoWindow;
        }
        let noColor = AppSettingsModel.instance.get('colorfulIcons') ? '' : 'grayscale';
        this.entries = this.model.filter.getEntries();
        this.result = this.entries.first();
        let presenter = new EntryPresenter(null, noColor, this.result && this.result.id);
        let itemsHtml = '';
        let itemTemplate = this.itemTemplate;
        this.entries.forEach(entry => {
            presenter.present(entry);
            itemsHtml += itemTemplate(presenter);
        });
        this.renderTemplate({
            filterText: this.model.filter.text,
            topMessage: topMessage,
            topClearFilterVisible: topClearFilterVisible,
            itemsHtml: itemsHtml
        });
        document.activeElement.blur();
        this.createScroll({
            root: this.$el.find('.at-select__items')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        return this;
    },

    remove() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_UP, this.upPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_DOWN, this.downPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, this);
        KeyHandler.off('keypress:auto-type');
        KeyHandler.setModal(null);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    cancelAndClose() {
        this.result = null;
        this.trigger('result', this.result);
    },

    closeWithResult() {
        this.trigger('result', this.result);
    },

    escPressed() {
        if (this.model.filter.text) {
            this.clearFilterText();
        } else {
            this.cancelAndClose();
        }
    },

    enterPressed() {
        this.closeWithResult();
    },

    upPressed(e) {
        e.preventDefault();
        let activeIndex = this.entries.indexOf(this.result) - 1;
        if (activeIndex >= 0) {
            this.result = this.entries.at(activeIndex);
            this.highlightActive();
        }
    },

    downPressed(e) {
        e.preventDefault();
        let activeIndex = this.entries.indexOf(this.result) + 1;
        if (activeIndex < this.entries.length) {
            this.result = this.entries.at(activeIndex);
            this.highlightActive();
        }
    },

    highlightActive() {
        this.$el.find('.at-select__item').removeClass('at-select__item--active');
        let activeItem = this.$el.find('.at-select__item[data-id="' + this.result.id + '"]');
        activeItem.addClass('at-select__item--active');
        let itemRect = activeItem[0].getBoundingClientRect();
        let listRect = this.scroller[0].getBoundingClientRect();
        if (itemRect.top < listRect.top) {
            this.scroller[0].scrollTop += itemRect.top - listRect.top;
        } else if (itemRect.bottom > listRect.bottom) {
            this.scroller[0].scrollTop += itemRect.bottom - listRect.bottom;
        }
    },

    keyPressed(e) {
        if (e.which) {
            this.model.filter.text += String.fromCharCode(e.which);
            this.render();
        }
    },

    backSpacePressed() {
        if (this.model.filter.text) {
            this.model.filter.text = this.model.filter.text.substr(0, this.model.filter.text.length - 1);
            this.render();
        }
    },

    clearFilterText() {
        this.model.filter.text = '';
        this.render();
    },

    clearFilterWindow() {
        this.model.filter.ignoreWindowInfo = true;
        this.render();
    },

    itemClicked(e) {
        let itemEl = $(e.target).closest('.at-select__item');
        let id = itemEl.data('id');
        this.result = this.entries.get(id);
        this.closeWithResult();
    }
});

_.extend(AutoTypePopupView.prototype, Scrollable);

module.exports = AutoTypePopupView;
