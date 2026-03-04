function createUsersController({ usersService }) {
  return {
    async create(req, res) {
      const user = await usersService.createUser(req.body || {});
      res.status(201).json(user);
    },

    list(req, res) {
      const { q, role, is_active } = req.query;
      const data = usersService.listUsers({
        q,
        role,
        is_active: is_active === undefined ? undefined : Number(is_active),
      });
      res.json({ data });
    },

    get(req, res) {
      const user = usersService.getUser(Number(req.params.id));
      res.json(user);
    },

    async update(req, res) {
      const user = await usersService.updateUser(Number(req.params.id), req.body || {});
      res.json(user);
    },

    setStatus(req, res) {
      const { is_active } = req.body || {};
      const result = usersService.setActive(Number(req.params.id), Number(is_active));
      res.json(result);
    },

    async changePassword(req, res) {
      const { password } = req.body || {};
      const result = await usersService.changePassword({
        actor: req.user,
        targetUserId: Number(req.params.id),
        newPassword: password,
      });
      res.json(result);
    },

    me(req, res) {
      res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      });
    },
  };
}

module.exports = { createUsersController };