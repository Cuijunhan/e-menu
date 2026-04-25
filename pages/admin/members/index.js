Page({
  data: {
    members: [],
    inviteCode: '',
    familyName: '',
    loading: true,
    selfOpenid: '',
  },

  async onLoad() {
    await this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const [profileRes, membersRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'user', data: { action: 'getProfile' } }),
        wx.cloud.callFunction({ name: 'user', data: { action: 'getMembers' } }),
      ])
      const profile = profileRes.result
      const members = membersRes.result
      this.setData({
        inviteCode: profile.invite_code || '',
        familyName: profile.family_name || '',
        selfOpenid: profile.openid || '',
        members: Array.isArray(members) ? members : [],
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'error' })
    }
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制邀请码', icon: 'success' }),
    })
  },

  async refreshInviteCode() {
    wx.showModal({
      title: '刷新邀请码',
      content: '旧邀请码将立即失效，确认刷新？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '刷新中...' })
        try {
          const r = await wx.cloud.callFunction({ name: 'user', data: { action: 'refreshInviteCode' } })
          wx.hideLoading()
          if (r.result && r.result.invite_code) {
            this.setData({ inviteCode: r.result.invite_code })
            wx.showToast({ title: '已刷新', icon: 'success' })
          } else {
            wx.showToast({ title: r.result.error || '刷新失败', icon: 'error' })
          }
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '刷新失败', icon: 'error' })
        }
      },
    })
  },

  async toggleRole(e) {
    const { id, role, nickname } = e.currentTarget.dataset
    const newRole = role === 'admin' ? 'member' : 'admin'
    const label = newRole === 'admin' ? '设为管理员' : '设为普通成员'
    wx.showModal({
      title: `修改权限`,
      content: `将「${nickname}」${label}？`,
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '修改中...' })
        try {
          const r = await wx.cloud.callFunction({
            name: 'user',
            data: { action: 'updateMemberRole', targetUserId: id, newRole },
          })
          wx.hideLoading()
          if (r.result && r.result.ok) {
            wx.showToast({ title: '已更新', icon: 'success' })
            await this.loadData()
          } else {
            wx.showToast({ title: r.result.error || '操作失败', icon: 'error' })
          }
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '操作失败', icon: 'error' })
        }
      },
    })
  },

  async kickMember(e) {
    const { id, nickname } = e.currentTarget.dataset
    wx.showModal({
      title: '移出成员',
      content: `将「${nickname}」移出家庭？`,
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '移出中...' })
        try {
          const r = await wx.cloud.callFunction({
            name: 'user',
            data: { action: 'removeMember', targetUserId: id },
          })
          wx.hideLoading()
          if (r.result && r.result.ok) {
            wx.showToast({ title: '已移出', icon: 'success' })
            await this.loadData()
          } else {
            wx.showToast({ title: r.result.error || '操作失败', icon: 'error' })
          }
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '操作失败', icon: 'error' })
        }
      },
    })
  },
})
