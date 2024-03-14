const Sauce = require('../models/sauce');

//gestion des fichiers (pour la suppression des images)//
const fs = require('fs');

//Afficher l'ensemble des sauces sur la page d'accueil- OK//
exports.getAllSauces = (req, res, next) => {
    Sauce.find()
    .then((sauce)=>res.status(200).json(sauce))
    .catch(error => res.status(400).json({error}))
};
//Afficher une sauce de manière individuelle- OK//
exports.getOneSauce = (req, res, next) => {
    Sauce.findOne({_id:req.params.id})
    .then((sauce)=>res.status(200).json(sauce))
    .catch(error => res.status(400).json({error}))
};

//Créer une sauce- OK//
exports.createSauce = (req, res,next) => {
    const sauceObject = JSON.parse(req.body.sauce);
    delete sauceObject._id;
    const sauce = new Sauce({
        ...sauceObject,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    });
    sauce.save()
    .then(() => { res.status(201).json({message: 'Objet enregistré !'})})
    .catch(error => { res.status(400).json( { error })})
console.log = "Objet créé"
};

//Modifier une sauce//
exports.modifySauce = (req, res,next) => {
    const sauceObject = req.file ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body };

    delete sauceObject._userId;
    Sauce.findOne({_id: req.params.id})
        .then((sauce) => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({ message : 'Not authorized'});
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Sauce.updateOne({ _id: req.params.id}, { ...sauceObject, _id: req.params.id})
                    .then(() => res.status(200).json({message : 'Objet modifié!'}))
                    .catch(error => res.status(401).json({ error }));
            });
        }
    })
        .catch((error) => {
            res.status(400).json({ error });
        });
};

//Supprimmer une sauce --  OK//
exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id})
        .then(sauce => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({message: 'Not authorized'});
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Sauce.deleteOne({_id: req.params.id})
                        .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                        .catch(error => res.status(401).json({ error }));
                });
            }
        })
        .catch( error => {
            res.status(500).json({ error });
        });
};

// LIKE OR DISLIKE Sauce
exports.likeSauce = (req, res, next) => {
    // Lorsque l'utilisateur clique sur le like//
    // Ajout d'un like + ajout de l'identifiant utilisateur dans le tableau des usersLiked//
    if (req.body.like === 1) {
    Sauce.updateOne(
        { _id: req.params.id },
        {
        $inc: { likes: req.body.like++ },
        $push: { usersLiked: req.body.userId },
        }
      )
        .then((sauce) => res.status(200).json({ message: "Un like de plus !" }))
        .catch((error) => res.status(400).json({ error }));
    }
  
      // Lorsque l'utilisateur clique sur le unlike//
    //suppression d'un like + ajout de l'identifiant utilisateur dans le tableau des usersDisliked//
    else if (req.body.like === -1) {
      Sauce.updateOne(
        { _id: req.params.id },
        {
          $inc: { dislikes: req.body.like++ * -1 },
          $push: { usersDisliked: req.body.userId },
        }
      )
        .then((sauce) =>
          res.status(200).json({ message: "Un dislike de plus !" })
        )
        .catch((error) => res.status(400).json({ error }));
    }
  
    // Si l'utilisateur reclique sur like ou dislike //
    // Retire le like ou le dislike et l'identifiant de l'utilisateur dans le tableau //
    else {
      Sauce.findOne({ _id: req.params.id })
        .then((sauce) => {
          if (sauce.usersLiked.includes(req.body.userId)) {
            Sauce.updateOne(
              { _id: req.params.id },
              { $pull: { usersLiked: req.body.userId }, $inc: { likes: -1 } }
            )
              .then((sauce) => {
                res.status(200).json({ message: "Un like de moins !" });
              })
              .catch((error) => res.status(400).json({ error }));
          } else if (sauce.usersDisliked.includes(req.body.userId)) {
            Sauce.updateOne(
              { _id: req.params.id },
              {
                $pull: { usersDisliked: req.body.userId },
                $inc: { dislikes: -1 },
              }
            )
              .then((sauce) => {
                res.status(200).json({ message: "Un dislike de moins !" });
              })
              .catch((error) => res.status(400).json({ error }));
          }
        })
        .catch((error) => res.status(400).json({ error }));
    }
  };
  