# antwerp

A tool for publishing multiple packages in mono-repos.

The tool allows for more control over the process of publishing
a package.  That process can be broken down into the following
steps:

1. Make changes to packages and bump versions appropriately.
2. Create tags for each version of a package.
3. Publish packages that have new tags.

In order to avoid unnecessary version bumping and the ensure that
each commit has consistent dependencies `antwerp` leaves step 1
to you.

After completing step 1, you can run `antwerp`.  It will look at
each package's version and create a new tag if one doesn't already
exist for that package.  Tags have the following format:

`${package.name}@${package.version}`

`antwerp` publishes packages using `npm` for each newly created 
tag.

You can do a dry run to see which commands `antwerp` runs by passing
it the `--dry-run` flag.

NOTES:
- you should run `npm login` before runing `antwerp` since there isn't
  a way to authenticate as it is runs commands
