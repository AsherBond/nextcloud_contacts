<!--
  - SPDX-FileCopyrightText: 2021 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<span v-if="source.heading" class="members-list__heading">
		{{ source.label }}
	</span>

	<ListItemIcon v-else
		:id="source.singleId"
		:avatar-size="avatarSize"
		:display-name="source.displayName"
		:icon-class="source.isUser ? null : 'icon-group-white'"
		:is-no-user="!source.isUser"
		:subname="levelName"
		:name="source.displayName"
		class="members-list__item">
		<!-- Accept invite -->
		<template v-if="!loading && isPendingApproval && circle.canManageMembers">
			<Actions>
				<ActionButton @click="acceptMember">
					<template #icon>
						<IconCheck :size="20" />
					</template>
					{{ t('contacts', 'Accept membership request') }}
				</ActionButton>
			</Actions>
			<Actions>
				<ActionButton @click="deleteMember">
					<template #icon>
						<IconClose :size="20" />
					</template>
					{{ t('contacts', 'Reject membership request') }}
				</ActionButton>
			</Actions>
		</template>

		<Actions v-else @close="onMenuClose">
			<ActionText v-if="loading" icon="icon-loading-small">
				{{ t('contacts', 'Loading …') }}
			</ActionText>

			<!-- Normal menu -->
			<template v-else>
				<!-- Level picker -->
				<template v-if="canChangeLevel">
					<ActionText>
						{{ t('contacts', 'Manage level') }}
						<template #icon>
							<ShieldCheck :size="16" />
						</template>
					</ActionText>
					<ActionButton v-for="level in availableLevelsChange"
						:key="level"
						icon=""
						@click="changeLevel(level)">
						{{ levelChangeLabel(level) }}
					</ActionButton>

					<ActionSeparator />
				</template>

				<!-- Leave or delete member from circle -->
				<ActionButton v-if="isCurrentUser && !circle.isOwner" @click="deleteMember">
					{{ t('contacts', 'Leave team') }}
					<template #icon>
						<ExitToApp :size="16" />
					</template>
				</ActionButton>
				<ActionButton v-else-if="canDelete" @click="deleteMember">
					<template #icon>
						<IconDelete :size="20" />
					</template>
					{{ t('contacts', 'Remove member') }}
				</ActionButton>
			</template>
		</Actions>
	</ListItemIcon>
</template>

<script>
import { CIRCLES_MEMBER_LEVELS, MemberLevels, MemberStatus } from '../../models/constants.ts'

import {
	NcActions as Actions,
	NcListItemIcon as ListItemIcon,
	NcActionSeparator as ActionSeparator,
	NcActionButton as ActionButton,
	NcActionText as ActionText,
} from '@nextcloud/vue'
import IconDelete from 'vue-material-design-icons/Delete.vue'
import IconCheck from 'vue-material-design-icons/Check.vue'
import IconClose from 'vue-material-design-icons/Close.vue'

import ExitToApp from 'vue-material-design-icons/ExitToApp.vue'
import ShieldCheck from 'vue-material-design-icons/ShieldCheck.vue'

import { changeMemberLevel } from '../../services/circles.ts'
import { showError } from '@nextcloud/dialogs'
import RouterMixin from '../../mixins/RouterMixin.js'

export default {
	name: 'MembersListItem',

	components: {
		Actions,
		ActionButton,
		ActionSeparator,
		ActionText,
		IconDelete,
		IconCheck,
		IconClose,
		ExitToApp,
		ListItemIcon,
		ShieldCheck,
	},
	mixins: [RouterMixin],

	props: {
		source: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			loading: false,
		}
	},

	computed: {
		/**
		 * Return the current circle
		 *
		 * @return {Circle}
		 */
		circle() {
			return this.$store.getters.getCircle(this.selectedCircle)
		},

		/**
		 * Current member level translated name
		 *
		 * @return {string}
		 */
		levelName() {
			if (this.source.level === MemberLevels.NONE) {
				return t('contacts', 'Pending')
			}

			return CIRCLES_MEMBER_LEVELS[this.source.level]
				|| CIRCLES_MEMBER_LEVELS[MemberLevels.MEMBER]
		},

		/**
		 * Current user member level
		 *
		 * @return {number}
		 */
		currentUserLevel() {
			return this.circle?.initiator?.level || MemberLevels.MEMBER
		},

		/**
		 * Current user member level
		 *
		 * @return {string}
		 */
		currentUserId() {
			return this.circle?.initiator?.singleId
		},

		/**
		 * Available levels change to the current user
		 *
		 * @return {Array}
		 */
		availableLevelsChange() {
			const levels = Object.keys(CIRCLES_MEMBER_LEVELS)
				// Object.keys returns those as string
				.map(level => parseInt(level, 10))
				// we cannot set to a level higher or equal than the current user's level
				.filter(level => level < this.currentUserLevel)

			// Admins can promote others as Admin too
			if (this.currentUserLevel === MemberLevels.ADMIN) {
				levels.push(MemberLevels.ADMIN)
			}

			// Owners transfer ownership to another member
			if (this.circle.isOwner) {
				levels.push(MemberLevels.OWNER)
			}

			// we cannot set to the level this member is already
			return levels.filter(level => level !== this.source.level)
		},

		/**
		 * Is the current member the current user?
		 *
		 * @return {boolean}
		 */
		isCurrentUser() {
			return this.currentUserId === this.source.singleId
		},

		/**
		 * Is the current member pending moderator approval?
		 *
		 * @return {boolean}
		 */
		isPendingApproval() {
			return this.source?.level === MemberLevels.NONE
				&& this.source?.status === MemberStatus.REQUESTING
		},

		/**
		 * Can the current user change the level of others?
		 *
		 * @return {boolean}
		 */
		canChangeLevel() {
			// we can change if the member is at the same
			// or lower level as the current user
			// BUT not an owner as there can/must always be one
			return this.source.level > MemberLevels.NONE
				&& this.availableLevelsChange.length > 0
				&& this.currentUserLevel >= this.source.level
				&& this.circle.canManageMembers
				&& !(this.circle.isOwner && this.isCurrentUser)
		},

		/**
		 * Can the current user delete members or?
		 *
		 * @return {boolean}
		 */
		canDelete() {
			return this.circle.canManageMembers
				&& this.source.level <= this.currentUserLevel
				&& !this.isCurrentUser
		},

		avatarSize() {
			return parseInt(window.getComputedStyle(document.body).getPropertyValue('--default-clickable-area'))
		},
	},
	methods: {
		/**
		 * Return the promote/demote member action label
		 *
		 * @param {MemberLevel} level the member level
		 * @return {string}
		 */
		levelChangeLabel(level) {
			if (level === MemberLevels.OWNER) {
				return t('contacts', 'Promote as sole owner')
			}

			if (this.source.level < level) {
				return t('contacts', 'Promote to {level}', { level: CIRCLES_MEMBER_LEVELS[level] })
			}
			return t('contacts', 'Demote to {level}', { level: CIRCLES_MEMBER_LEVELS[level] })
		},

		/**
		 * Delete the current member
		 */
		async deleteMember() {
			this.loading = true

			try {
				await this.$store.dispatch('deleteMemberFromCircle', {
					member: this.source,
					leave: this.isCurrentUser,
				})
			} catch (error) {
				if (error?.response?.status === 404) {
					this.logger.debug('Member is not in circle')
					return
				}
				console.error('Could not delete the member', this.source, error)
				showError(t('contacts', 'Could not delete the member {displayName}', this.source))
			} finally {
				this.loading = false
			}
		},

		async changeLevel(level) {
			this.loading = true

			try {
				await changeMemberLevel(this.circle.id, this.source.id, level)
				this.showLevelMenu = false

				// If we changed an owner, let's refresh the whole dataset to update all ownership & memberships
				if (level === MemberLevels.OWNER) {
					await this.$store.dispatch('getCircle', this.circle.id)
					await this.$store.dispatch('getCircleMembers', this.circle.id)
					return
				}

				// this.source is a class. We're modifying the class setter, not the prop itself
				// eslint-disable-next-line vue/no-mutating-props
				this.source.level = level
			} catch (error) {
				console.error('Could not change the member level to', CIRCLES_MEMBER_LEVELS[level])
				showError(t('contacts', 'Could not change the member level to {level}', {
					level: CIRCLES_MEMBER_LEVELS[level],
				}))
			} finally {
				this.loading = false
			}
		},

		async acceptMember() {
			this.loading = true

			try {
				await await this.$store.dispatch('acceptCircleMember', {
					circleId: this.circle.id,
					memberId: this.source.id,
				})
			} catch (error) {
				console.error('Could not accept membership request', this.source, error)
				showError(t('contacts', 'Could not accept membership request'))
			} finally {
				this.loading = false
			}
		},

		/**
		 * Reset menu on close
		 */
		onMenuClose() {
			this.showLevelMenu = false
		},
	},
}
</script>
<style lang="scss">
.members-list__heading {
	display: flex;
	overflow: hidden;
	flex-shrink: 0;
	padding-top: 22px;
	padding-left: 8px;
	user-select: none;
	white-space: nowrap;
	text-overflow: ellipsis;
	pointer-events: none;
	color: var(--color-primary-element);
	line-height: 22px;
}

.members-list__item {
	padding: 8px;
	user-select: none;
	box-sizing: border-box;
	margin-bottom: 8px;
	border-radius: var(--border-radius-rounded);

	&:focus,
	&:hover {
		background-color: var(--color-background-hover);
	}
}

</style>
