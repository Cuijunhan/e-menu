const app = getApp()

Page({
  data: {
    step: 'choose', // choose | create | join
    form: { family_name: '', nickname: '', invite_code: '' },
    loading: false,
  },

  goCreate() { this.setData({ step: 'create' }) },
  goJoin() { this.setData({ step: 'join' }) },
  goBack() { this.setData({ step: 'choose' }) },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ form: Object.assign({}, this.data.form, { [field]: e.detail.value }) })
  },

  async submitCreate() {
    const { family_name, nickname } = this.data.form
    if (!family_name.trim()) {
      wx.showToast({ title: '请输入家庭名称', icon: 'none' }); return
    }
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入你的昵称', icon: 'none' }); return
    }
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'createFamily', family_name: family_name.trim(), nickname: nickname.trim() },
      })
      const result = res.result
      if (result && result.error) {
        wx.showToast({ title: result.error, icon: 'none' })
        return
      }
      // 更新全局状态
      app.globalData.familyId = result.family_id
      app.globalData.role = 'admin'
      app.globalData.isAdmin = true
      app.globalData.familyName = result.family_name
      app.globalData.nickname = nickname.trim()
      wx.showToast({ title: '家庭创建成功', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/home/home' })
      }, 1200)
    } catch (e) {
      wx.showToast({ title: '创建失败，请重试', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async submitJoin() {
    const { invite_code, nickname } = this.data.form
    if (!invite_code.trim() || invite_code.trim().length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' }); return
    }
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入你的昵称', icon: 'none' }); return
    }
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'joinFamily', invite_code: invite_code.trim(), nickname: nickname.trim() },
      })
      const result = res.result
      if (result && result.error) {
        wx.showToast({ title: result.error, icon: 'none' })
        return
      }
      app.globalData.familyId = result.family_id
      app.globalData.role = 'member'
      app.globalData.isAdmin = false
      app.globalData.familyName = result.family_name
      app.globalData.nickname = nickname.trim()
      wx.showToast({ title: '加入成功', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/home/home' })
      }, 1200)
    } catch (e) {
      wx.showToast({ title: '加入失败，请重试', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
