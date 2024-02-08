/* eslint-disable vue/match-component-file-name */
/**
 * @copyright Copyright (c) 2018 John Molakvoæ <skjnldsv@protonmail.com>
 *
 * @author John Molakvoæ <skjnldsv@protonmail.com>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */
import { generateFilePath } from '@nextcloud/router'
import { getRequestToken } from '@nextcloud/auth'
import { sync } from 'vuex-router-sync'
import Vue from 'vue'

import App from './ContactsRoot.vue'
import router from './router/index.js'
import store from './store/index.js'
import logger from './services/logger.js'

/** GLOBAL COMPONENTS AND DIRECTIVE */
import ClickOutside from 'vue-click-outside'
import { Tooltip as VTooltip } from '@nextcloud/vue'

// Global scss sheets
import '../css/contacts.scss'

// Dialogs css
import '@nextcloud/dialogs/dist/index.css'

// eslint-disable-next-line import/no-unresolved, n/no-missing-import
import 'vite/modulepreload-polyfill'

// Register global directives
Vue.directive('ClickOutside', ClickOutside)
Vue.directive('Tooltip', VTooltip)

sync(store, router)

Vue.prototype.t = t
Vue.prototype.n = n

Vue.prototype.appName = appName
Vue.prototype.appVersion = appVersion
Vue.prototype.logger = logger
Vue.prototype.OC = window.OC
Vue.prototype.OCA = window.OCA

// Force redirect if rewrite enabled but accessed through index.php
if (window.location.pathname.split('/')[1] === 'index.php'
	&& window.OC.config.modRewriteWorking) {
	router.push({
		name: 'group',
		params: { selectedGroup: t('contacts', 'All contacts') },
	})
}

export default new Vue({
	el: '#content',
	name: 'ContactsApp',
	router,
	store,
	render: h => h(App),
})
