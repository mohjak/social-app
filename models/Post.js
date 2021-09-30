const postsCollection = require("../db").db().collection('posts')
const ObjectID = require('mongodb').ObjectID
const User = require('./User')

let Post = function(data, userId) {
  this.data = data
  this.errors = []
  this.userId = userId
}

Post.prototype.cleanUp = function() {
  if (typeof(this.data.title) != "string") {this.data.title = ""}
  if (typeof(this.data.body) != "string") {this.data.body = ""}

  // Git rid of any pogus properties
  this.data = {
    title: this.data.title.trim(),
    body: this.data.body.trim(),
    createdDate: new Date(),
    author: ObjectID(this.userId)
  }
}

Post.prototype.validate = function() {
  if (this.data.title == "") {this.errors.push("You must proived a title.")}
  if (this.data.body == "") {this.errors.push("You must proived post content.")}
}

Post.prototype.create = function() {
  return new Promise((resolve, reject) => {
    this.cleanUp()
    this.validate()
    if (!this.errors.length) {
      // save post into database
      postsCollection.insertOne(this.data).then(() => {
        resolve()
      }).catch(() => {
        this.errors.push('Please try again later.')
        reject(this.errors)
      })
    } else {
      reject(this.errors)
    }
  })
}

Post.reuseablePostQuery = function(uniqueOperations, visitorId) {
  return new Promise(async function(resolve, reject) {
    let agOperations = uniqueOperations.concat([
      {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
      {$project: {
        title: 1,
        body: 1,
        createdDate: 1,
        authorId: "$author",
        author: {$arrayElemAt: ["$authorDocument", 0]}
      }}
    ])

    let posts = await postsCollection.aggregate(agOperations).toArray()

    // clean up author property in each post object
    posts = posts.map(function(post) {
      post.isVisitorOwner = post.authorId.equals(visitorId)

      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar
      }

      return post
    })

    resolve(posts)
  })
}

Post.findSingleById = function(id, visitorId) {
  return new Promise(async function(resolve, reject) {
    if (typeof(id) != "string" || !ObjectID.isValid(id)) {
      reject()
      return
    }
    
    let posts = await Post.reuseablePostQuery([
      {$match: {_id: new ObjectID(id)}}
    ], visitorId)

    if (posts.length) {
      resolve(posts[0])
    } else {
      reject()
    }
  })
}

Post.findByAuthorId = function(authorId) {
  return Post.reuseablePostQuery([
    {$match: {author: authorId}},
    {$sort: {createdDate: -1}}
  ])
}

module.exports = Post